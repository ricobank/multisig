const { task } = require('hardhat/config')


const debug = require('debug')('ricobank:task')
const dpack = require('@etherpacks/dpack')
const { b32, ray, rad, send, wad, BANKYEAR } = require('minihat')
const GASLIMIT = '1000000000000'

task('deploy-multisig', '')
  .addParam('netname', 'network name to load packs from')
  .addParam('wait', 'multisig wait time (seconds)')
  .addParam('writepack', 'write to pack file')
  .setAction(async (args, hre) => {
    debug('network name in task:', hre.network.name)
    const [ali, bob, cat] = await hre.ethers.getSigners()
    let msig_type_pack = require(`../pack/msig_${args.netname}.dpack.json`)
    msig_type_pack.network = hre.network.name
    let deployer = await dpack.load(msig_type_pack, hre.ethers, ali)
    const msig = await deployer._types.Multisig.deploy(2, [ali.address, bob.address, cat.address].sort(), hre.network.config.chainId, 1)

    const pb = new dpack.PackBuilder(hre.network.name)
    await pb.packObject({
        objectname: 'msig',
        address: msig.address,
        typename: 'Multisig',
        artifact: require('../artifacts/src/Multisig.vy/Multisig.json')
    }, true)

    const pack = await pb.build()
    if (args.writepack) {
        const outfile = require('path').join(
            __dirname, `../pack/msig_${hre.network.name}.dpack.json`
        )
        const packstr = JSON.stringify(pack, null, 2)
        require('fs').writeFileSync(outfile, packstr)
    }
    return pack
})
