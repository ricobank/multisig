require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-vyper')
require('./task/deploy-multisig.js')

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    defaultNetwork: "hardhat",
    vyper: {
        version: "0.3.7"
    },
    paths: {
        sources: "./src"
    },
    networks: {
        hardhat: {
            blockGasLimit: 10000000000000,
            forking: {
                url: process.env["RPC_URL"],
                blockNumber: 16445606,
                chainId: 1,
            },
        },
        arbitrum_goerli: {
            url: process.env["ARB_GOERLI_RPC_URL"],
            accounts: {
                mnemonic: process.env["ARB_GOERLI_MNEMONIC"]
            },
            chainId: 421613
        }
    }
}
