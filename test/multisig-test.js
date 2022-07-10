// SPDX-License-Identifier: MIT

const hh = require('hardhat')
const ethers = hh.ethers
const { BigNumber, utils } = require("ethers")
const { send, wad } = require('minihat')

const TestHarness = require('./test-harness')

let DOMAIN_SEPARATOR
const TXTYPE_HASH           = '0x77a02b8d4d89821b65796d535cba07669f292aede4f4a6e17753e6e3d2499732'
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
    console.log('in first test')

    const [ali, bob, cat, dan] = await ethers.getSigners()
    const threshold = 3
    const executor = ali.address
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

    const v_arr = []
    const r_arr = []
    const s_arr = []

    let domain_data = EIP712DOMAINTYPE_HASH
                   + NAME_HASH.slice(2) 
                   + VERSION_HASH.slice(2)
                   + utils.hexlify(chain_id).slice(2).padStart(64, '0')
                   + multisig.address.slice(2).padStart(64, '0')
                   + SALT.slice(2)
    domain_data = domain_data.toLowerCase()
    DOMAIN_SEPARATOR = utils.keccak256(domain_data)
    
    let tx_input = TXTYPE_HASH
                + rico.address.slice(2).padStart(64, '0')
                + utils.hexlify(eth_amt).slice(2).padStart(64, '0')
                + utils.keccak256(data).slice(2)
                + utils.hexlify(nonce).slice(2).padStart(64, '0')
                + executor.slice(2).padStart(64, '0')
    tx_input = tx_input.toLowerCase()
    let tx_input_hash = utils.keccak256(tx_input)
    
    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)

    let msg_hash_bin = ethers.utils.arrayify(msg_hash);

    for (signer of signers) {
        const raw_sig = await signer.signMessage(msg_hash_bin)
        const split_sig = utils.splitSignature(raw_sig)

        v_arr.push(split_sig.v)
        r_arr.push(split_sig.r)
        s_arr.push(split_sig.s)
    }

    await send(multisig.exec, v_arr, r_arr, s_arr, rico.address, eth_amt, data, executor,  {gasLimit: 10000000})

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
        assert.equal(e.reason, "VM Exception while processing transaction: reverted with reason string 'Config err'")
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
        assert.equal(e.reason, "VM Exception while processing transaction: reverted with reason string 'Order err'")
    }
})
