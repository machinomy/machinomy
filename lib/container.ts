import log from './util/log'

const REG_LOG = log('Registry')
const CONT_LOG = log('Container')

export interface ServiceDefinition {
  name: string,
  factory: Function,
  dependencies: Array<string>,
  isSingleton: boolean
}

export class Registry {
  private registry: { [name: string]: ServiceDefinition }

  constructor (otherRegistry?: Registry) {
    this.clear()

    if (otherRegistry) {
      const otherServices = otherRegistry.services()
      otherServices.forEach((name) => (this.registry[name] = otherRegistry.get(name)))
    }
  }

  clear (): void {
    this.registry = {}
  }

  bind (name: string, factory: Function, dependencies: Array<string> = [], isSingleton: boolean = true) {
    REG_LOG(`Registering service ${name}.`)

    if (this.registry[name]) {
      throw new Error(`A service named ${name} is already defined.`)
    }

    this.registry[name] = {
      name,
      factory,
      dependencies,
      isSingleton
    }
  }

  get (name: string): ServiceDefinition {
    const service = this.registry[name]

    if (!service) {
      throw new Error(`Service with name ${name} not found`)
    }

    return service
  }

  services (): string[] {
    return Object.keys(this.registry)
  }
}

export class Container {
  private registry: Registry

  private cache: { [name: string]: any }

  constructor (registry: Registry) {
    this.registry = registry
    this.clear()
  }

  resolve<T> (name: string) {
    return this.internalResolve<T>(name, [])
  }

  clear (): void {
    this.cache = {}
  }

  private internalResolve<T> (name: string, visited: string[]) {
    CONT_LOG(`Resolving service ${name}.`)

    if (visited[0] === name || visited[visited.length - 1] === name) {
      throw new Error(`Found cyclic dependencies: [${visited.join(',')},${name}]`)
    }

    const definition = this.registry.get(name)

    if (!definition.isSingleton) {
      CONT_LOG(`Instantiating non-singleton service ${name}.`)

      return this.instantiate(definition, visited)
    }

    if (this.cache[name]) {
      CONT_LOG(`Returning cached singleton service ${name}.`)
      return this.cache[name]
    }

    CONT_LOG(`Instantiating singleton service ${name}.`)

    const instance = this.instantiate(definition, visited)
    this.cache[name] = instance
    return instance as T
  }

  private instantiate<T> (definition: ServiceDefinition, visited: string[]) {
    visited.push(definition.name)
    const dependencies = definition.dependencies.map(
      (dep: string) => this.internalResolve(dep, visited.slice()))
    const instance = definition.factory.apply(null, dependencies)
    return instance as T
  }
}

export const serviceRegistry = new Registry()

export default serviceRegistry
