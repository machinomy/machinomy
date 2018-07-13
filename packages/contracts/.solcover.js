module.exports = {
  copyPackages: ['openzeppelin-solidity'],
  testCommand: 'truffle test lib/*.test.js',
  skipFiles: ['support/TestToken.sol']
}
