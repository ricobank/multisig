require('@nomiclabs/hardhat-ethers')
require('./lib/gemfab/task/deploy-gemfab.ts')
require ('./task/mock-deploy')

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            blockGasLimit: 1000000000
        },
    }
}
