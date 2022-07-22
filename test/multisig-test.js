// SPDX-License-Identifier: MIT

const hh = require('hardhat')
const ethers = hh.ethers
const { BigNumber, utils } = require("ethers")
const { send, wad } = require('minihat')

const TestHarness = require('./test-harness')

const TXTYPE_HASH           = '0xb7267299ee78157c26d16798607b94eb975a922c460faff36ef284150d471f6d'
const NAME_HASH             = '0xe463279c76a26a807fc93adcd7da8c78758960944d3dd615283d0a9fa20efdc6'
const VERSION_HASH          = '0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6'
const EIP712DOMAINTYPE_HASH = '0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472'
const SALT                  = '0x129d390a401694aef5508ae83353e4124512a4c5bf5b10995b62abe1fb85b650'

TestHarness.test('msig moves ether', async (harness, assert) => {
    // Setup
    const prior_balance = await ethers.provider.getBalance(ethers.constants.AddressZero)
    const expiry = BigNumber.from(Date.now()).add(10000)
    // Deploy new multisig contract
    const msig = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    // send new msig some eth
    await harness.signers[0].sendTransaction({
        to: msig.address,
        value: wad(1)
    })
    // Create Transaction
    const nonce = await msig.nonce()
    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig.address, SALT)
    const tx_hash = createTransactionHash(TXTYPE_HASH, ethers.constants.AddressZero, wad(1), ethers.constants.Zero, nonce, expiry)
    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash)

    // Sign Transaction
    const [v, r, s] = await sign(harness.signers, msg_hash_bin)
    await send(msig.exec, v, r, s, ethers.constants.AddressZero, wad(1), ethers.constants.Zero, expiry, { gasLimit: 10000000 })
    // Check that the ether was moved
    const new_balance = await ethers.provider.getBalance(ethers.constants.AddressZero)
    assert.equal(new_balance.sub(prior_balance).eq(wad(1)), true)
})

TestHarness.test('msig can call other msig', {
}, async (harness, assert) => {
    // Setup
    const prior_balance = await ethers.provider.getBalance(ethers.constants.AddressZero)
    const expiry = BigNumber.from(Date.now()).add(10000)
    // Deploy two msigs
    const msig1 = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    const msig2 = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    // Send some eth to msig2
    await harness.signers[0].sendTransaction({
        to: msig2.address,
        value: wad(1)
    })
    // Sign Msig2 Transaction
    const nonce2 = await msig2.nonce()
    const DOMAIN_SEPARATOR2 = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig2.address, SALT)
    const tx_hash2 = createTransactionHash(TXTYPE_HASH, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, nonce2, expiry)
    let input2 = '0x19' + '01' + DOMAIN_SEPARATOR2.slice(2) + tx_hash2.slice(2)
    let msg_hash2 = utils.keccak256(input2)
    let msg_hash_bin2 = ethers.utils.arrayify(msg_hash2)
    const [v2, r2, s2] = await sign(harness.signers, msg_hash_bin2)
    const tx2 = msig2.interface.encodeFunctionData("exec", [v2, r2, s2, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, expiry])
    // Sign Msig1 Transaction
    const nonce1 = await msig1.nonce()
    const DOMAIN_SEPARATOR1 = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig1.address, SALT)
    const tx_hash1 = createTransactionHash(TXTYPE_HASH, msig2.address, 0, tx2, nonce1, expiry)
    let input1 = '0x19' + '01' + DOMAIN_SEPARATOR1.slice(2) + tx_hash1.slice(2)
    let msg_hash1 = utils.keccak256(input1)
    let msg_hash_bin1 = ethers.utils.arrayify(msg_hash1)
    const [v1, r1, s1] = await sign(harness.signers, msg_hash_bin1)
    await send(msig1.exec, v1, r1, s1, msig2.address, 0, tx2, expiry, { gasLimit: 10000000 })
    // Check that the ether was moved
    const new_balance = await ethers.provider.getBalance(ethers.constants.AddressZero)
    assert.equal(new_balance.sub(prior_balance).eq(wad(1)), true)
})

TestHarness.test('msig rejects expired tx', {
}, async (harness, assert) => {
    const now = Date.now()
    const expiry = BigNumber.from(now).sub(1)
    const msig = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    const nonce = await msig.nonce()

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, nonce, expiry)

    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash)

    const [v_arr, r_arr, s_arr] = await sign(harness.signers, msg_hash_bin)
    await ethers.provider.send("evm_setNextBlockTimestamp", [now])
    try {
        await send(msig.exec, v_arr, r_arr, s_arr, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, expiry, { gasLimit: 10000000 })
        assert.fail()
    } catch (e) {
        assert.equal(e, "Error: VM Exception while processing transaction: reverted with reason string 'err/expired'")
    }
})

TestHarness.test('msig accepts valid non-zero expiry', {
}, async (harness, assert) => {
    const now = Date.now()
    const expiry = BigNumber.from(now).add(1)
    const msig = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    const nonce = await msig.nonce()
    const prior_balance = await ethers.provider.getBalance(harness.members[1])

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, harness.members[1], wad(1), ethers.constants.HashZero, nonce, expiry)

    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash)

    const [v_arr, r_arr, s_arr] = await sign(harness.signers, msg_hash_bin)
    await ethers.provider.send("evm_setNextBlockTimestamp", [now])
    await send(msig.exec, v_arr, r_arr, s_arr, harness.members[1], wad(1), ethers.constants.HashZero, expiry, { value: wad(1), gasLimit: 10000000 })
    const new_balance = await ethers.provider.getBalance(harness.members[1])
    assert.equal(new_balance.sub(prior_balance).eq(wad(1)), true)
})

TestHarness.test('re-throw if raw call reverts', {
}, async (harness, assert) => {
    const now = Date.now()
    const expiry = BigNumber.from(now).add(10000)
    const msig = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    const nonce = await msig.nonce()
    const prior_balance = await ethers.provider.getBalance(ethers.constants.AddressZero)

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, nonce, expiry)

    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash)

    const [v_arr, r_arr, s_arr] = await sign(harness.signers, msg_hash_bin)
    // should revert as msig has no ether to send
    try {
        await send(msig.exec, v_arr, r_arr, s_arr, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, expiry, { gasLimit: 10000000 })
        assert.fail()
    } catch (e) {
        // pass
    }
    const new_balance = await ethers.provider.getBalance(ethers.constants.AddressZero)
    assert.equal(new_balance.eq(prior_balance), true)
    assert.equal(nonce.eq(await msig.nonce()), true)
})

TestHarness.test('insufficient members', {
}, async (harness, assert) => {
    const expiry = BigNumber.from(Date.now()).add(10000)
    const msig = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    const nonce = await msig.nonce()

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, nonce, expiry)

    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash)

    const [v_arr, r_arr, s_arr] = await sign(harness.signers.slice(1), msg_hash_bin)
    try {
        await send(msig.exec, v_arr, r_arr, s_arr, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, expiry, { gasLimit: 10000000 })
        assert.fail()
    } catch (e) {
        assert.equal(e, "Error: VM Exception while processing transaction: reverted with reason string 'err/num_sigs'")
    }

})

TestHarness.test('wrong members', {
}, async (harness, assert) => {
    const expiry = BigNumber.from(Date.now()).add(10000)
    const msig = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    const nonce = await msig.nonce()

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, nonce, expiry)

    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash)

    const [bad_signer, good_signer_1, good_signer_2] = await ethers.getSigners()
    const [v_arr, r_arr, s_arr] = await sign(harness.sort_participants([bad_signer, good_signer_1, good_signer_2]).signers, msg_hash_bin)
    try {
        await send(msig.exec, v_arr, r_arr, s_arr, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, expiry, { gasLimit: 10000000 })
        assert.fail()
    } catch (e) {
        assert.equal(e, "Error: VM Exception while processing transaction: reverted with reason string 'err/not_member'")
    }
})

TestHarness.test('repeated signatures', {
}, async (harness, assert) => {
    const expiry = BigNumber.from(Date.now()).add(10000)
    const msig = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    const nonce = await msig.nonce()

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, nonce, expiry)

    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash)

    const [v_arr, r_arr, s_arr] = await sign(harness.sort_participants([harness.signers[0], harness.signers[1], harness.signers[0]]).signers, msg_hash_bin)
    try {
        await send(msig.exec, v_arr, r_arr, s_arr, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, expiry, { gasLimit: 10000000 })
        assert.fail()
    } catch (e) {
        assert.equal(e, "Error: VM Exception while processing transaction: reverted with reason string 'err/owner_order'")
    }
})

TestHarness.test('member addresses wrong order', {
}, async (harness, assert) => {
    const expiry = BigNumber.from(Date.now()).add(10000)
    const msig = await harness.msig_factory.deploy(3, harness.members, harness.chainId)
    const nonce = await msig.nonce()

    const DOMAIN_SEPARATOR = createDomainSeparator(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH,
        harness.chainId, msig.address, SALT)
    const tx_input_hash = createTransactionHash(TXTYPE_HASH, ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, nonce, expiry)

    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + tx_input_hash.slice(2)
    let msg_hash = utils.keccak256(input)
    let msg_hash_bin = ethers.utils.arrayify(msg_hash)

    const [v_arr, r_arr, s_arr] = await sign(harness.signers, msg_hash_bin)
    try {
        await send(msig.exec, v_arr.reverse(), r_arr.reverse(), s_arr.reverse(), ethers.constants.AddressZero, wad(1), ethers.constants.HashZero, expiry, { gasLimit: 10000000 })
        assert.fail()
    } catch (e) {
        assert.equal(e, "Error: VM Exception while processing transaction: reverted with reason string 'err/owner_order'")
    }
})

TestHarness.test('fail create too many members', {
}, async (harness, assert) => {
    const members = [...Array(17).keys()].map((_) => ethers.Wallet.createRandom());
    try {
        await harness.msig_factory.deploy(17, harness.sort_participants(members).members, harness.chainId)
        assert.fail()
    } catch (e) {
        // pass
    }
})

TestHarness.test('fail create with threshold > members', {
}, async (harness, assert) => {
    const threshold = 4
    try {
        await harness.msig_factory.deploy(threshold, harness.members, harness.chainId)
        assert.fail() // ensure failure if doesn't throw
    } catch (e) {
        assert.equal(e.reason, "VM Exception while processing transaction: reverted with reason string 'err/min_owners'")
    }
})

TestHarness.test('fail create member addresses wrong order', {
}, async (harness, assert) => {
    const threshold = 3
    try {
        await harness.msig_factory.deploy(threshold, harness.members.reverse(), harness.chainId)
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

sign = async (signers, msg_hash) => {
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