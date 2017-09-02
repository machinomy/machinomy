import homedir = require('homedir')
import { Log } from 'typescript-logger'
import path = require('path')
import Web3 = require('web3')
import * as env from './env'

declare var web3: Web3 | undefined

const BASE_DIR = '.machinomy'
const COFNGIRATION_FILE = 'config.json'
const DATABASE_FILE = 'storage.db'
export const VERSION = '0.0.3'
export const PROTOCOL = 'machinomy/' + VERSION
export const PAYWALL_PATH = 'api/paywall/' + PROTOCOL

const log = Log.create('configuration')

const CONTRACTS = {
  development: '0xede26550428812f833ad7a8d1a9019561d243d6c',
  ropsten: '0xc365a7c7d222b781e7b50a95e005d89243fc650d'
}

export const CONTRACT_INTERFACE: Web3.ContractAbi = [
  {
    constant: true,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'getState',
    outputs: [
      {
        name: '',
        type: 'uint8'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'close',
    outputs: [],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: 'sender',
        type: 'address'
      },
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'canFinishSettle',
    outputs: [
      {
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: false,
    inputs: [],
    name: 'kill',
    outputs: [],
    payable: false,
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        name: 'receiver',
        type: 'address'
      },
      {
        name: 'duration',
        type: 'uint256'
      },
      {
        name: 'settlementPeriod',
        type: 'uint256'
      }
    ],
    name: 'createChannel',
    outputs: [],
    payable: true,
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      },
      {
        name: 'payment',
        type: 'uint256'
      },
      {
        name: 'h',
        type: 'bytes32'
      },
      {
        name: 'v',
        type: 'uint8'
      },
      {
        name: 'r',
        type: 'bytes32'
      },
      {
        name: 's',
        type: 'bytes32'
      }
    ],
    name: 'claim',
    outputs: [],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: 'sender',
        type: 'address'
      },
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'canStartSettle',
    outputs: [
      {
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'finishSettle',
    outputs: [],
    payable: false,
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      },
      {
        name: 'payment',
        type: 'uint256'
      }
    ],
    name: 'settle',
    outputs: [],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      },
      {
        name: 'h',
        type: 'bytes32'
      },
      {
        name: 'v',
        type: 'uint8'
      },
      {
        name: 'r',
        type: 'bytes32'
      },
      {
        name: 's',
        type: 'bytes32'
      }
    ],
    name: 'canClaim',
    outputs: [
      {
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      },
      {
        name: 'payment',
        type: 'uint256'
      }
    ],
    name: 'startSettle',
    outputs: [],
    payable: false,
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'deposit',
    outputs: [],
    payable: true,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'isOpenChannel',
    outputs: [
      {
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: 'sender',
        type: 'address'
      },
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'canDeposit',
    outputs: [
      {
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'getPayment',
    outputs: [
      {
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    constant: true,
    inputs: [
      {
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'getUntil',
    outputs: [
      {
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    type: 'function'
  },
  {
    inputs: [],
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'sender',
        type: 'address'
      },
      {
        indexed: true,
        name: 'receiver',
        type: 'address'
      },
      {
        indexed: false,
        name: 'channelId',
        type: 'bytes32'
      }
    ],
    name: 'DidCreateChannel',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'channelId',
        type: 'bytes32'
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'DidDeposit',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'channelId',
        type: 'bytes32'
      },
      {
        indexed: false,
        name: 'payment',
        type: 'uint256'
      }
    ],
    name: 'DidStartSettle',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'channelId',
        type: 'bytes32'
      },
      {
        indexed: false,
        name: 'payment',
        type: 'uint256'
      },
      {
        indexed: false,
        name: 'oddValue',
        type: 'uint256'
      }
    ],
    name: 'DidSettle',
    type: 'event'
  }
]

export const contractAddress = (): string => {
  const container = env.container()
  const network = container.MACHINOMY_NETWORK || 'ropsten'
  const address = container.CONTRACT_ADDRESS
  if (address) {
    return address
  } else {
    return (CONTRACTS as any)[network]
  }
}

export const baseDirPath = (): string => {
  return path.resolve(path.join(homedir(), BASE_DIR))
}

export const configFilePath = (): string => {
  return path.join(baseDirPath(), COFNGIRATION_FILE)
}

const databaseFilePath = (): string => {
  return path.join(baseDirPath(), DATABASE_FILE)
}

export interface IConfigurationOptions {
  account?: string
  password?: string
  engine?: string
}

export class Configuration {
  public account?: string
  public password?: string
  public engine?: string
  public databaseFile: string
  public path: string

  constructor (options: IConfigurationOptions) {
    this.account = options.account
    this.password = options.password
    this.engine = options.engine
    this.databaseFile = databaseFilePath()
    this.path = configFilePath()
  }
}

/**
 * @returns {object}
 */
export const configurationOptions = () => {
  try {
    const fs = require('fs')
    return JSON.parse(fs.readFileSync(configFilePath(), 'utf8'))
  } catch (error) {
    log.error(error)
    return {}
  }
}

export const sender = (): Configuration => {
  try {
    const options = configurationOptions()
    return new Configuration({
      account: process.env.MACHINOMY_SENDER_ACCOUNT || options.sender.account,
      password: process.env.MACHINOMY_SENDER_PASSWORD || options.sender.password,
      engine: process.env.MACHINOMY_SENDER_ENGINE || options.sender.engine
    })
  } catch (error) {
    return new Configuration({})
  }
}

export const receiver = (): Configuration => {
  try {
    const options = configurationOptions()
    return new Configuration({
      account: process.env.MACHINOMY_RECEIVER_ACCOUNT || options.receiver.account,
      password: process.env.MACHINOMY_RECEIVER_PASSWORD || options.receiver.password,
      engine: process.env.MACHINOMY_SENDER_ENGINE || options.sender.engine
    })
  } catch (error) {
    log.error(error)
    return new Configuration({})
  }
}

export function currentProvider (): Web3.Provider {
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    return web3.currentProvider
  } else {
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    return new Web3.providers.HttpProvider('http://localhost:8545')
  }
}
