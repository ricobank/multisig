// SPDX-License-Identifier: MIT

const dpack = require('@etherpacks/dpack')
const hh = require('hardhat')
const ethers = hh.ethers
const { send, wad } = require('minihat')

const tapzero = require('tapzero');
const testHarness = require('tapzero/harness');

// This only gives equivalent to beforeEach() rather than before() so no snapshot reverts.
// Mocha is easier to use, has before(), but many dependencies. Which compliments snek best?
class TestHarness {
    constructor(opts) {
        console.log('construct harness')
        this.opts = opts
    }

    async bootstrap() {
        console.log('bootstrap harness')
        const [signer] = await ethers.getSigners()
        const pack = await hh.run('mock-deploy')
        const dapp = await dpack.load(pack, hh.ethers, signer)
        this.rico = dapp.rico
        this.multisig_deployer = await dapp._types['Multisig']
        await send(this.rico.mint, signer.address, wad(10000))
        // await snapshot(hh)
    }

    async close() {
        console.log('close harness')
    }
}

TestHarness.test = testHarness(tapzero, TestHarness)

module.exports = TestHarness
