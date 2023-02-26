const fs = require('fs')
const process = require("node:process")

const { Command } = require('commander')
const ethProvider = require('eth-provider')
const ethers = require('ethers')
const { BigNumber } = require('ethers')
const { send } = require("minihat")

const contracts = require('./out/SrcOutput.json')
const { createDomainSeparator, createTransactionHash } = require('./helpers.js');

const program = new Command()
const frame = ethProvider('frame')

program
    .name('msig')
    .description(`Msig is a tool for building the inputs to vyper multisig transactions, and interacting with deployed instances.
It requires frame.sh running for signing, and uses a json file to record and share transaction data.`)
    .option("-i,--input <string>", 'json file containing tx data and existing signatures', './tx.json')
    .option("-o,--output <string>", 'output file containing tx data and existing signatures', './tx.json')
    .option("-d,--deploy <string>", 'json file with deployment settings', './deploy.json')
    .version('0.0.1')

program.command('bare')
    .description('create a tx config template at --output and a deploy template at --deploy')
    .action(() => { bare(program.opts().output, program.opts().deploy) })

program.command('deploy')
    .description('deploy msig based on --deploy config file')
    .action(async () => { await deploy(program.opts().deploy) })

program.command('sign')
    .description('add a signature to the v, r, and s arrays in the tx json file.')
    .action(async () => { await sign(program.opts().input, program.opts().output) })

program.command('load')
    .description('send a transaction to load() with calldata derived from the json file')
    .action(async () => { await load(program.opts().input) })

program.command('fire')
    .description('send a transaction to fire() at the address set in the --input json file')
    .action(async () => { await fire(program.opts().input) })

const bare = (out_file, deploy_file) => {
    const expiry = Date.now() + 4*7*24*60*60
    const chain_id = 1337
    const template = {
        "chain_id": chain_id,
        "msig_addr": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        "domain_hash": "0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472",
        "name_hash": "0xe463279c76a26a807fc93adcd7da8c78758960944d3dd615283d0a9fa20efdc6",
        "version_hash": "0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6",
        "salt_hash": "0x129d390a401694aef5508ae83353e4124512a4c5bf5b10995b62abe1fb85b650",
        "tx_type_hash": "0xc22bd03800e8d0fb968a99a54aeb6261577647195ab20a990aaa169b65ddee05",
        "target_addr": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        "func_sig": "function transfer(address to, uint amount)",
        "func_args": "['0x5FbDB2315678afecb367f032d93F642f64180aa3', 100]",
        "eth_amount": 0,
        "nonce": 0,
        "expiry": expiry,
        "delegate": 0,
        "v": [],
        "r": [],
        "s": [],
        "signers": []
    }
    fs.writeFileSync(out_file, JSON.stringify(template, null, "\t"))
    console.log(`wrote tx template to ${out_file}`)
    
    const deploy_template = {
        "provider_addr": 'http://127.0.0.1:7545/',
        "threshold": 2,
        "members": ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
        "chain_id": chain_id,
        "wait": 0
    }
    fs.writeFileSync(deploy_file, JSON.stringify(deploy_template, null, "\t"))
    console.log(`wrote deploy template to ${deploy_file}`)
    
    process.exit(0)
}

const deploy = async (deploy_file) => {
    const conf = require(deploy_file)
    const prov = new ethers.providers.JsonRpcProvider(conf.provider_addr)
    const signer = prov.getSigner(0)
    const msig = contracts.contracts['src/Multisig.vy'].Multisig
    const fact = new ethers.ContractFactory(msig.abi, msig.evm.bytecode, signer)
    const inst = await fact.deploy(conf.threshold, conf.members, conf.chain_id, conf.wait)
    console.log(`deployed to address ${inst.address}`)
    process.exit(0)
}

const sign = async (in_file, out_file) => {
    const conf = require(in_file)

    const data = get_encoded_data(conf)
    const tx_hash = createTransactionHash(conf.tx_type_hash, conf.target_addr, conf.eth_amount,
                                          data, conf.nonce, conf.expiry, conf.delegate)
    const domain_sep = createDomainSeparator(conf.domain_hash, conf.name_hash, conf.version_hash,
                                             conf.chain_id, conf.msig_addr, conf.salt_hash)
    const input = '0x19' + '01' + domain_sep.slice(2) + tx_hash.slice(2)
    const msg_hash = ethers.utils.keccak256(input)

    const usr = (await frame.request({ method: 'eth_requestAccounts' }))[0]
    const raw_sig = await frame.request({ method: 'eth_sign', params: [usr, msg_hash] })
    const split_sig = ethers.utils.splitSignature(raw_sig)
    conf.v.push(split_sig.v)
    conf.r.push(split_sig.r)
    conf.s.push(split_sig.s)
    conf.signers.push(usr)
    if (signers_ascending(conf.signers)) {
        fs.writeFileSync(out_file, JSON.stringify(conf, null, "\t"))
        console.log(`appended to v, r and s in ${out_file}`)
    } else {
        console.log('ERR did not sign, signing in wrong order')
    }
    process.exit(0)
}

const load = async (in_file) => {
    const msig = await get_contract(in_file)
    const conf = require(in_file)
    const data = get_encoded_data(conf)
    await send(msig.load, conf.v, conf.r, conf.s, conf.target_addr, conf.eth_amount, data, conf.expiry,
               conf.delegate, { gasLimit: 5000000 })
    process.exit(0)
}

const fire = async (in_file) => {
    const msig = await get_contract(in_file)
    await send(msig.fire, { gasLimit: 5000000 })
    process.exit(0)
}

const get_encoded_data = (conf) => {
    const params = eval(conf.func_args)
    for (let i = 0; i < params.length; i++) {
        if (typeof params[i] == 'number') {
            params[i] = BigNumber.from(params[i].toString())
        }
    }
    const func_name = conf.func_sig.split(/[ (]/)[1]
    const iface = new ethers.utils.Interface([conf.func_sig])
    return iface.encodeFunctionData(func_name, params)
}

const get_contract = async (in_file) => {
    const conf = require(in_file)
    await frame.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: conf.chain_id }],
    });
    const provider = new ethers.providers.Web3Provider(frame)
    const abi  = contracts.contracts['src/Multisig.vy'].Multisig.abi
    const signer = provider.getSigner(0)
    return new ethers.Contract(conf.msig_addr, abi, signer)
}

const signers_ascending = (signers) => {
    let last = BigNumber.from('0')
    for (const addr of signers) {
        const addr_bn = BigNumber.from(addr)
        if (addr_bn.lt(last)) return false
        last = addr_bn
    }
    return true
}

program.parse()
