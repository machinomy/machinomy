import * as Deployer from 'truffle-deployer'

const ECRecovery = artifacts.require('./ECRecovery.sol')
const UnidirectionalToken = artifacts.require('./UnidirectionalToken.sol')

module.exports = function (deployer: Deployer) {
  return deployer.deploy(ECRecovery).then(() => {
    return deployer.link(ECRecovery, UnidirectionalToken)
  }).then(() => {
    return deployer.deploy(UnidirectionalToken)
  })
}
