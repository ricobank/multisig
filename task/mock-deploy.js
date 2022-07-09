// SPDX-License-Identifier: MIT

const fs = require('fs')

const dpack = require('@etherpacks/dpack')
const { send } = require("minihat");

task('mock-deploy', async (args, hh) => {
    const packdir = './pack/'
    if (!fs.existsSync(packdir)) fs.mkdirSync(packdir)

    const gf_pack = await hre.run('deploy-gemfab')
    const pb = await dpack.builder(hh.network.name)
    const gem_artifact = await dpack.getIpfsJson(gf_pack.types.Gem.artifact['/'])
    const [signer] = await ethers.getSigners()
    const gf_dapp = await dpack.load(gf_pack, hre.ethers, signer)
    const receipt = await send(gf_dapp.gemfab.build, 'Rico', 'RICO')
    const [, rico_address] = receipt.events.find(event => event.event === 'Build').args
    await pb.packObject({
        objectname: 'rico',
        address: rico_address,
        typename: 'Gem',
        artifact: gem_artifact
    }, false)

    const multisig_output = require('../out/SrcOutput.json')
    const multisig_obj = Object.values(multisig_output.contracts)[0]['Multisig']
    const multisig_artifact = {'abi': multisig_obj.abi, 'bytecode': multisig_obj.evm.bytecode.object}

    await pb.packType({
        typename: 'Multisig',
        artifact: multisig_artifact
    })

    await pb.merge(gf_pack)
    const pack = await pb.build()

    const show =(o)=> JSON.stringify(o, null, 2)

    fs.writeFileSync(packdir + `Multisig.json`, show(multisig_artifact))
    fs.writeFileSync(packdir + `multisig_${hh.network.name}.dpack.json`, show(pack))

    return pack
})
