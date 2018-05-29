import * as Web3 from 'web3'
import * as util from 'ethereumjs-util'
import { CompiledResult, ContractEntry } from './compiler'

enum AbiType {
  Function = 'function',
  Constructor = 'constructor',
  Event = 'event',
  Fallback = 'fallback'
}

export namespace NatSpec {
  export type Container = {[name: string]: Entry}

  export interface Entry {
    author?: string
    title?: string
    fileName: string
    name?: string
    abi?: Web3.ContractAbi
    abiDocs: any
  }

  function functionSignature (signature: string): string {
    return util.sha3(signature).toString('hex').substr(0, 8)
  }

  function functionDefinition (entry: ContractEntry, definition: Web3.MethodAbi): any {
    let inputParams = definition.inputs
    let name = definition.name
    let signature = `${name}(${inputParams.map(i => i.type).join(',')})`
    let devDocs = entry.devdoc.methods[signature] || {}
    let userDocs = entry.userdoc.methods[signature] || {}

    let params = devDocs.params || {}
    let inputs = inputParams.map(param => ({ ...param, description: params[param.name] }))
    delete devDocs.params

    let outputParams = {}
    let outputs = []
    try {
      outputParams = JSON.parse(devDocs.return)
    } catch (e) {
      try {
        const split = devDocs.return.split(' ')
        const name = split.shift()
        outputParams = { [name]: split.join(' ') }
      } catch (e2) { /*  */ }
    }
    try {
      outputs = definition.outputs.map(param => ({ ...param, description: outputParams[param.name] }))
    } catch (e) { /*  */ }

    return {
      ...definition,
      ...devDocs,
      ...userDocs,
      inputs,
      outputs,
      signature,
      signatureHash: signature && functionSignature(signature)
    }
  }

  function eventDefinition (entry: ContractEntry, definition: Web3.EventAbi): any {
    let inputParams = definition.inputs
    let name = definition.name
    let signature = `${name}(${inputParams.map(i => i.type).join(',')})`
    let devDocs = entry.devdoc.methods[signature] || {}
    let userDocs = entry.userdoc.methods[signature] || {}

    let params = devDocs.params || {}
    let inputs = inputParams.map(param => ({ ...param, description: params[param.name] }))
    delete devDocs.params

    return {
      ...definition,
      ...devDocs,
      ...userDocs,
      inputs,
      signature,
      signatureHash: signature && functionSignature(signature)
    }
  }


  function buildDefinition (entry: ContractEntry, definition: Web3.AbiDefinition): any {
    switch (definition.type) {
      case AbiType.Function:
        return functionDefinition(entry, definition)
      case AbiType.Event:
        return eventDefinition(entry, definition)
      case AbiType.Constructor:
        return {
          ...definition,
          inputs: definition.inputs
        }
      case AbiType.Fallback:
        return {
          ...definition,
          inputs: []
        }
      default:
        throw new Error(`Got unexpected definition ${definition.type}`)
    }
  }

  function buildEntry (fileName: string, name: string, entry: ContractEntry): Entry {
    return {
      fileName: fileName,
      author: entry.devdoc.author,
      title: entry.devdoc.title,
      name: name,
      abiDocs: entry.abi.map(definition => buildDefinition(entry, definition)),
      abi: entry.abi
    }
  }

  export async function build (input: CompiledResult, whitelist: Array<string> = []): Promise<Container> {
    let contracts = input.contracts
    let result: Container = {}
    Object.keys(contracts).forEach(fileName => {
      let contractEntry = contracts[fileName]
      let name = Object.keys(contractEntry)[0]
      if (whitelist.length > 0 && whitelist.includes(name)) {
        result[name] = buildEntry(fileName, name, contractEntry[name])
      }
    })

    return result
  }
}

export default NatSpec
