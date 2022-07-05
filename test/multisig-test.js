const hh = require('hardhat')
const ethers = hh.ethers
const { BigNumber } = require('ethers')
const { send, wad } = require('minihat')

const MyTestHarness = require('./test-harness')

MyTestHarness.test('msig moves tokens', {
}, async function t(harness, assert) {
    console.log('in first test')

    const threshold = 3
    const amount = 1000
    const chainId = await hh.network.config.chainId;
    [ali, bob, cat, dan] = await ethers.getSigners();
    [ALI, BOB, CAT, DAN] = [ali, bob, cat, dan].map(signer => signer.address)
    const members = [ALI, BOB, CAT]
    members.sort((a, b) => (BigNumber.from(a).gt(BigNumber.from(b))) ? 1 : -1)
    const multisig = await harness.multisig_deployer.deploy(threshold, members, chainId)
    await send(harness.rico.transfer, multisig.address, wad(100))

    bob_rico_1 = await harness.rico.balanceOf(BOB)
    assert.equal(bob_rico_1, 0)

    // TODO

    console.log('done first test')
});

MyTestHarness.test('insufficient members', {
}, async function t(harness, assert) {

});

MyTestHarness.test('wrong members', {
}, async function t(harness, assert) {

});

MyTestHarness.test('too many members', {
}, async function t(harness, assert) {

});

MyTestHarness.test('too many members', {
}, async function t(harness, assert) {

});

MyTestHarness.test('repeated members', {
}, async function t(harness, assert) {

});

MyTestHarness.test('member addresses wrong order', {
}, async function t(harness, assert) {

});

MyTestHarness.test('fail create with threshold > members', {
}, async function t(harness, assert) {

});