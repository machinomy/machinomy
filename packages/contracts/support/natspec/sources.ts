import * as truffleContractSources from 'truffle-contract-sources'
import * as Profiler from 'truffle-compile/profiler'
import * as Config from 'truffle-config'
import * as Resolver from 'truffle-resolver'
import * as Artifactor from 'truffle-artifactor'

export type FullText = {[name: string]: string}

/**
 * Configuration of the current Truffle project.
 */
export async function currentConfig (): Promise<Config> {
  let config = Config.default()
  config.resolver = new Resolver(config)
  config.artifactor = new Artifactor()
  config.paths = await contractPaths(config)
  config.base_path = config.contracts_directory
  return config
}

/**
 * Subset of configuration needed to [[contractPaths]] function.
 */
interface ContractFilesConfig {
  contracts_directory: string
}

/**
 * Paths to the contracts managed by Truffle.
 */
export async function contractPaths (config: ContractFilesConfig): Promise<Array<string>> {
  return new Promise<Array<string>>((resolve, reject) => {
    truffleContractSources(config.contracts_directory, (err, files) => {
      err ? reject(err) : resolve(files)
    })
  })
}

/**
 * Subset of configuration needed to [[requiredSources]] function.
 */
interface RequiredSourcesConfig {
  base_path: string
  resolver: any
  paths: Array<string>
}

/**
 * Sources of contracts along with the dependencies, for the current Truffle project.
 */
export async function requiredSources (config: RequiredSourcesConfig): Promise<FullText> {
  return new Promise<FullText>((resolve, reject) => {
    Profiler.required_sources(config, (err, sources) => {
      err ? reject(err) : resolve(sources)
    })
  })
}
