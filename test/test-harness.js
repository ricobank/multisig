// SPDX-License-Identifier: MIT

const hh = require('hardhat')
const ethers = hh.ethers
const { BigNumber } = require('ethers');

const tapzero = require('tapzero');
const testHarness = require('tapzero/harness');

const sorted_participants = (participants) => {
    const signers = participants.sort((a, b) =>
        (BigNumber.from(a.address).gt(BigNumber.from(b.address))) ? 1 : -1)
    const members = signers.map(signer => signer.address)
    return { signers, members }
}
// This only gives equivalent to beforeEach() rather than before() so no snapshot reverts.
// Mocha is easier to use, has before(), but many dependencies. Which compliments snek best?
class TestHarness {
    constructor(opts) {
        console.log('construct harness')
        this.opts = opts
    }

    async bootstrap() {
        console.log('bootstrap harness')
        const [signer, ali, bob, cat] = await ethers.getSigners()
        let msig = require('../out/SrcOutput.json')
        msig = Object.values(msig.contracts)[0].Multisig
        const msig_factory = new ethers.ContractFactory(msig.abi, msig.evm.bytecode, signer)
        const { members, signers } = sorted_participants([ali, bob, cat])
        this.msig_factory = msig_factory
        this.signers = signers
        this.members = members
        this.chainId = hh.network.config.chainId
        this.sort_participants = sorted_participants
        // await snapshot(hh)
    }

    async close() {
        console.log('close harness')
    }
}

TestHarness.test = testHarness(tapzero, TestHarness)

module.exports = TestHarness
