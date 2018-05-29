import * as solc from 'solc'
import * as Web3 from 'web3'
import { FullText } from './sources'

export interface MethodDevDoc {
  details?: string
  params?: {[method: string]: string}
  return?: any
}

export interface DevDoc {
  author?: string
  title?: string
  name?: string
  methods?: {[signature: string]: MethodDevDoc}
}

export interface AbiDocDefinition {

}

export interface UserDoc {
  methods?: {[signature: string]: any}
}

export interface ContractEntry {
  devdoc?: DevDoc
  userdoc?: UserDoc
  abi?: Web3.ContractAbi
  abiDocs?: AbiDocDefinition[]
}

export interface CompiledResult {
  contracts: {
    [fileName: string]: {
      [name: string]: ContractEntry
    }
  }
}

export async function doc (fullText: FullText): Promise<CompiledResult> {
  const standardInput = {
    language: 'Solidity',
    sources: {},
    settings: {
      outputSelection: {
        '*': {
          '*': [
            'devdoc',
            'userdoc',
            'abi'
          ]
        }
      }
    }
  }
  for (let name in fullText) {
    standardInput.sources[name] = {
      content: fullText[name]
    }
  }
  let result = solc.compileStandard(JSON.stringify(standardInput))
  return JSON.parse(result)as CompiledResult
}
