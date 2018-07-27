const HDWalletProvider = require("truffle-hdwallet-provider")
const MNEMONIC = process.env.MNEMONIC
const GAS_LIMIT = 2700000

module.exports = {
  networks: {
    development: {
      network_id: "*",
      host: "localhost",
      port: 8545,
      gas: GAS_LIMIT
    },
    ropsten: { // from: 0x9a6942bD73680F300940C8222BBe067c3c74d96D
      network_id: 3,
      provider: () => new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/"),
      gas: GAS_LIMIT
    },
    kovan: {
      network_id: 42,
      gas: GAS_LIMIT,
      provider: () => new HDWalletProvider(MNEMONIC, "https://kovan.infura.io/"),
    },
    mainnet: {
      network_id: 1,
      provider: () => new HDWalletProvider(MNEMONIC, "https://mainnet.infura.io/"),
      gasPrice: 20000000000,
      gas: GAS_LIMIT
    },
    rinkeby: {
      host: "localhost",
      port: 8545,
      network_id: 4,
      from: '0x13d1be93e913d910245a069c67fc4c45a3d0b2fc',
      gas: GAS_LIMIT
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
}
