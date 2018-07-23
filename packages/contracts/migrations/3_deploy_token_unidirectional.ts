import * as Deployer from 'truffle-deployer'

const ECRecovery = artifacts.require('./ECRecovery.sol')
const TokenUnidirectional = artifacts.require('./TokenUnidirectional.sol')

module.exports = function (deployer: Deployer) {
  return deployer.link(ECRecovery, TokenUnidirectional).then(() => {
    return deployer.deploy(TokenUnidirectional)
  })
}
