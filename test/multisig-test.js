// SPDX-License-Identifier: MIT

const hh = require('hardhat')
const ethers = hh.ethers
const { BigNumber, utils } = require("ethers")
const { send, wad } = require('minihat')

const TestHarness = require('./test-harness')

let DOMAIN_SEPARATOR
const TXTYPE_HASH           = '0x1c0c624cfeaf296646eaf07ff3cfb2d1c85be20b6c4e8ac4e58683aa231be09b'
const NAME_HASH             = '0xe463279c76a26a807fc93adcd7da8c78758960944d3dd615283d0a9fa20efdc6'
const VERSION_HASH          = '0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6'
const EIP712DOMAINTYPE_HASH = '0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472'
const SALT                  = '0x129d390a401694aef5508ae83353e4124512a4c5bf5b10995b62abe1fb85b650'

const sorted_participants = (participants) => {
    const signers = participants.sort((a, b) =>
        (BigNumber.from(a.address).gt(BigNumber.from(b.address))) ? 1 : -1)
    const members = signers.map(signer => signer.address)
    return {signers, members}
}

TestHarness.test('msig moves tokens', {
}, async (harness, assert) => {

    const [ali, bob, cat, dan] = await ethers.getSigners()
    const threshold = 3
    const rico_amt = wad(100)
    const eth_amt  = wad(0)
    const chain_id = await hh.network.config.chainId;
    const rico = harness.rico
    const data = rico.interface.encodeFunctionData("transfer", [ bob.address, rico_amt ])
    const expiry = BigNumber.from(0) // 0 = no expiry
    const {signers, members} = sorted_participants([ali, bob, cat])
    const multisig = await harness.multisig_deployer.deploy(threshold, members, chain_id)
    const nonce = await multisig.nonce()
    await send(rico.transfer, multisig.address, rico_amt)

    bob_rico_1 = await rico.balanceOf(bob.address)
    assert.equal(bob_rico_1, 0)

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH, chain_id, multisig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, rico.address, eth_amt, data, nonce, expiry)
    
    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash);

    const [v_arr, r_arr, s_arr] = await sign(signers, msg_hash_bin)
    await send(multisig.exec, v_arr, r_arr, s_arr, rico.address, eth_amt, data, expiry, {gasLimit: 10000000})

    bob_rico_2 = await rico.balanceOf(bob.address)
    assert.equal(bob_rico_2.sub(rico_amt).eq(bob_rico_1), true)
})

TestHarness.test('msig rejects expired tx', {
}, async (harness, assert) => {
    const now = Date.now()
    const expiry = BigNumber.from(now).sub(1)
    const [ali, bob, cat] = await ethers.getSigners()
    const threshold = 3
    const rico_amt = wad(100)
    const eth_amt  = wad(0)
    const chain_id = await hh.network.config.chainId;
    const rico = harness.rico
    const data = rico.interface.encodeFunctionData("transfer", [ bob.address, rico_amt ])
    const {signers, members} = sorted_participants([ali, bob, cat])
    const multisig = await harness.multisig_deployer.deploy(threshold, members, chain_id)
    const nonce = await multisig.nonce()

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH, chain_id, multisig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, rico.address, eth_amt, data, nonce, expiry)
    
    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash);

    const [v_arr, r_arr, s_arr] = await sign(signers, msg_hash_bin)
    await ethers.provider.send("evm_setNextBlockTimestamp", [now])
    try {
        await send(multisig.exec, v_arr, r_arr, s_arr, rico.address, eth_amt, data, expiry, {gasLimit: 10000000})
        assert.fail()
    } catch(e) {
        assert.equal(e, "Error: VM Exception while processing transaction: reverted with reason string 'err/expired'")
    }
})

TestHarness.test('msig accepts valid non-zero expiry', {
}, async (harness, assert) => {
    const now = Date.now()
    const expiry = BigNumber.from(now).add(1)
    const [ali, bob, cat] = await ethers.getSigners()
    const threshold = 3
    const rico_amt = wad(100)
    const eth_amt  = wad(0)
    const chain_id = await hh.network.config.chainId;
    const rico = harness.rico
    const data = rico.interface.encodeFunctionData("transfer", [ bob.address, rico_amt ])
    const {signers, members} = sorted_participants([ali, bob, cat])
    const multisig = await harness.multisig_deployer.deploy(threshold, members, chain_id)
    const nonce = await multisig.nonce()
    await send(rico.transfer, multisig.address, rico_amt)

    bob_rico_1 = await rico.balanceOf(bob.address)
    assert.equal(bob_rico_1, 0)

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH, chain_id, multisig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, rico.address, eth_amt, data, nonce, expiry)
    
    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash);

    const [v_arr, r_arr, s_arr] = await sign(signers, msg_hash_bin)
    await ethers.provider.send("evm_setNextBlockTimestamp", [now])
    await send(multisig.exec, v_arr, r_arr, s_arr, rico.address, eth_amt, data, expiry, {gasLimit: 10000000})

    bob_rico_2 = await rico.balanceOf(bob.address)
    assert.equal(bob_rico_2.sub(rico_amt).eq(bob_rico_1), true)
})

TestHarness.test('insufficient members', {
}, async (harness, assert) => {

})

TestHarness.test('wrong members', {
}, async (harness, assert) => {

})

TestHarness.test('too many members', {
}, async (harness, assert) => {

})

TestHarness.test('too many members', {
}, async (harness, assert) => {

})

TestHarness.test('repeated members', {
}, async (harness, assert) => {

})

TestHarness.test('member addresses wrong order', {
}, async (harness, assert) => {

})

TestHarness.test('fail create with threshold > members', {
}, async (harness, assert) => {
    const [ali, bob ] = await ethers.getSigners()
    const threshold = 3
    const chain_id = await hh.network.config.chainId;
    const {_, members} = sorted_participants([ali, bob])
    try {
        await harness.multisig_deployer.deploy(threshold, members, chain_id)
        assert.fail() // ensure failure if doesn't throw
    } catch (e) { 
        assert.equal(e.reason, "VM Exception while processing transaction: reverted with reason string 'err/min_owners'")
    }
})

TestHarness.test('fail create member addresses wrong order', {
}, async (harness, assert) => {
    const [ali, bob, cat] = await ethers.getSigners()
    const threshold = 3
    const chain_id = await hh.network.config.chainId;
    const {_, members} = sorted_participants([ali, bob, cat])
    try {
        await harness.multisig_deployer.deploy(threshold, members.reverse(), chain_id)
        assert.fail() // ensure failure if doesn't throw
    } catch (e) { 
        assert.equal(e.reason, "VM Exception while processing transaction: reverted with reason string 'err/owner_order'")
    }
})

// Test Helper Functions 
function createDomainSeparator(domain_type_hash, name_hash, version_hash, chain_id, address, salt) {
    const domain_data = domain_type_hash
                   + name_hash.slice(2) 
                   + version_hash.slice(2)
                   + utils.hexlify(chain_id).slice(2).padStart(64, '0')
                   + address.slice(2).padStart(64, '0')
                   + salt.slice(2)
    return utils.keccak256(domain_data.toLowerCase())
}

function createTransactionHash(tx_type_hash, target_address, amount, data, nonce, expiry) {
     let tx_input = tx_type_hash
                + target_address.slice(2).padStart(64, '0')
                + utils.hexlify(amount).slice(2).padStart(64, '0')
                + utils.keccak256(data).slice(2)
                + utils.hexlify(nonce).slice(2).padStart(64, '0')
                + utils.hexlify(expiry).slice(2).padStart(64, '0')
    return utils.keccak256(tx_input.toLowerCase())
}

sign = async(signers, msg_hash) => {
    const [v, r, s] = [[], [], []]
    for (signer of signers) {
        const raw_sig = await signer.signMessage(msg_hash)
        const split_sig = utils.splitSignature(raw_sig)
        v.push(split_sig.v)
        r.push(split_sig.r)
        s.push(split_sig.s)
    }
    return [v, r, s]
}