// assemble packs for existing deployments

const fs = require('fs')

const dpack = require('@etherpacks/dpack')

// Artifacts compiled from etherscan data on 11 Jan 22
// Verified with remix
const msig_artifact = require('./artifacts/src/Multisig.vy/Multisig.json')

async function build(network) {
    const builder = new dpack.PackBuilder(network)
    console.log("ABI ", msig_artifact.abi)
    console.log("BYTECODE ", msig_artifact.bytecode)
    await builder.packType({
        typename: 'Multisig',
        artifact: { abi: msig_artifact.abi, bytecode: msig_artifact.bytecode }
    })

    const pack = builder.build()

    fs.writeFileSync(`./pack/msig_${network}.dpack.json`, JSON.stringify(pack, null, 2));
}

build('ethereum')
build('arbitrum_goerli')
