'use strict'

const Web3 = require('web3')
const path = require('path')
const homedir = require('homedir')
const fs = require('fs')

const VERSION = '0.0.3'
const PROTOCOL = 'machinomy/' + VERSION
const PAYWALL_PATH = 'paywall/' + PROTOCOL
const BASE_DIR = '.machinomy'
const COFNGIRATION_FILE = 'config.json'
const DATABASE_FILE = 'storage.db'

const CONTRACTS = {
  development: '0xede26550428812f833ad7a8d1a9019561d243d6c',
  ropsten: '0xc365a7c7d222b781e7b50a95e005d89243fc650d',
  homestead: null
}

const CONTRACT_INTERFACE = [
  {
    'constant': true,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'getState',
    'outputs': [
      {
        'name': '',
        'type': 'uint8'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'close',
    'outputs': [],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': 'sender',
        'type': 'address'
      },
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'canFinishSettle',
    'outputs': [
      {
        'name': '',
        'type': 'bool'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [],
    'name': 'kill',
    'outputs': [],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': 'receiver',
        'type': 'address'
      },
      {
        'name': 'duration',
        'type': 'uint256'
      },
      {
        'name': 'settlementPeriod',
        'type': 'uint256'
      }
    ],
    'name': 'createChannel',
    'outputs': [],
    'payable': true,
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      },
      {
        'name': 'payment',
        'type': 'uint256'
      },
      {
        'name': 'h',
        'type': 'bytes32'
      },
      {
        'name': 'v',
        'type': 'uint8'
      },
      {
        'name': 'r',
        'type': 'bytes32'
      },
      {
        'name': 's',
        'type': 'bytes32'
      }
    ],
    'name': 'claim',
    'outputs': [],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': 'sender',
        'type': 'address'
      },
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'canStartSettle',
    'outputs': [
      {
        'name': '',
        'type': 'bool'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'finishSettle',
    'outputs': [],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      },
      {
        'name': 'payment',
        'type': 'uint256'
      }
    ],
    'name': 'settle',
    'outputs': [],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      },
      {
        'name': 'h',
        'type': 'bytes32'
      },
      {
        'name': 'v',
        'type': 'uint8'
      },
      {
        'name': 'r',
        'type': 'bytes32'
      },
      {
        'name': 's',
        'type': 'bytes32'
      }
    ],
    'name': 'canClaim',
    'outputs': [
      {
        'name': '',
        'type': 'bool'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      },
      {
        'name': 'payment',
        'type': 'uint256'
      }
    ],
    'name': 'startSettle',
    'outputs': [],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'deposit',
    'outputs': [],
    'payable': true,
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'isOpenChannel',
    'outputs': [
      {
        'name': '',
        'type': 'bool'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': 'sender',
        'type': 'address'
      },
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'canDeposit',
    'outputs': [
      {
        'name': '',
        'type': 'bool'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'getPayment',
    'outputs': [
      {
        'name': '',
        'type': 'uint256'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'getUntil',
    'outputs': [
      {
        'name': '',
        'type': 'uint256'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'inputs': [],
    'type': 'constructor'
  },
  {
    'anonymous': false,
    'inputs': [
      {
        'indexed': true,
        'name': 'sender',
        'type': 'address'
      },
      {
        'indexed': true,
        'name': 'receiver',
        'type': 'address'
      },
      {
        'indexed': false,
        'name': 'channelId',
        'type': 'bytes32'
      }
    ],
    'name': 'DidCreateChannel',
    'type': 'event'
  },
  {
    'anonymous': false,
    'inputs': [
      {
        'indexed': true,
        'name': 'channelId',
        'type': 'bytes32'
      },
      {
        'indexed': false,
        'name': 'value',
        'type': 'uint256'
      }
    ],
    'name': 'DidDeposit',
    'type': 'event'
  },
  {
    'anonymous': false,
    'inputs': [
      {
        'indexed': true,
        'name': 'channelId',
        'type': 'bytes32'
      },
      {
        'indexed': false,
        'name': 'payment',
        'type': 'uint256'
      }
    ],
    'name': 'DidStartSettle',
    'type': 'event'
  },
  {
    'anonymous': false,
    'inputs': [
      {
        'indexed': true,
        'name': 'channelId',
        'type': 'bytes32'
      },
      {
        'indexed': false,
        'name': 'payment',
        'type': 'uint256'
      },
      {
        'indexed': false,
        'name': 'oddValue',
        'type': 'uint256'
      }
    ],
    'name': 'DidSettle',
    'type': 'event'
  }
]

const contractAddress = function () {
  let network = process.env.MACHINOMY_NETWORK || 'ropsten' // FIXME Document this
  return CONTRACTS[network]
}

const contractInterface = function () {
  return CONTRACT_INTERFACE
}

const baseDirPath = function () {
  return path.resolve(path.join(homedir(), BASE_DIR))
}

const configFilePath = function () {
  return path.join(baseDirPath(), COFNGIRATION_FILE)
}

const databaseFilePath = function () {
  return path.join(baseDirPath(), DATABASE_FILE)
}

const Configuration = function (options) {
  this.account = options.account
  this.password = options.password
  this.databaseFile = databaseFilePath()
  this.path = configFilePath()
}

/**
 * @returns {object}
 */
const configurationOptions = function () {
  return JSON.parse(fs.readFileSync(configFilePath(), 'utf8'))
}

/**
 * @returns {Configuration}
 */
const sender = function () {
  try {
    var options = configurationOptions()
    return new Configuration({
      account: process.env.MACHINOMY_SENDER_ACCOUNT || options['sender']['account'],
      password: process.env.MACHINOMY_SENDER_PASSWORD || options['sender']['password']
    })
  } catch (ex) {
    return new Configuration({})
  }
}

/**
 * @returns {Configuration}
 */
const receiver = function () {
  try {
    let options = configurationOptions()
    return new Configuration({
      account: process.env.MACHINOMY_RECEIVER_ACCOUNT || options['receiver']['account'],
      password: process.env.MACHINOMY_RECEIVER_PASSWORD || options['receiver']['password']
    })
  } catch (ex) {
    return new Configuration({})
  }
}

const canReadConfig = function () {
  try {
    fs.accessSync(configFilePath(), fs.constants.R_OK)
    return true
  } catch (ex) {
    return false
  }
}

const canParseConfig = function () {
  try {
    configurationOptions()
    return true
  } catch (ex) {
    return false
  }
}

const canCreateDatabase = function () {
  try {
    fs.accessSync(baseDirPath(), fs.constants.R_OK | fs.constants.W_OK)
    return true
  } catch (ex) {
    return false
  }
}

const ensureBaseDirPresent = function () {
  if (!fs.existsSync(baseDirPath())) {
    fs.mkdir(baseDirPath())
  }
}

const ensure = function (command) {
  return function () {
    ensureBaseDirPresent()

    if (!canCreateDatabase()) {
      console.error('Can not create database file in ' + baseDirPath() + '. Please, check if one can create a file there.')
    } else if (!canReadConfig()) {
      console.error('Can not read configuration file. Please, check if it exists, or run `machinomy setup` command for an initial configuration')
    } else if (!canParseConfig()) {
      console.error('Can not parse configuration file. Please, ')
    } else {
      command.apply(null, arguments)
    }
  }
}

const _web3 = () => {
  let instance = null

  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    instance = new Web3(web3.currentProvider);
  } else {
    console.log('No web3? You should consider trying MetaMask!')
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    instance = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  return instance
}

module.exports = {
  web3: _web3,
  VERSION: VERSION,
  PAYWALL_PATH: PAYWALL_PATH,
  CONTRACT_INTERFACE: CONTRACT_INTERFACE,
  contractAddress: contractAddress,
  contractInterface: contractInterface,
  sender: sender,
  receiver: receiver,
  ensure: ensure,
  baseDirPath: baseDirPath,
  configFilePath: configFilePath,
  configurationOptions: configurationOptions
}
