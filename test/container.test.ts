import { Container, Registry } from '../lib/container'
import * as sinon from 'sinon'
import expect = require('expect')

let lastId = 0

class InstanceCounter {
  id: number

  constructor () {
    this.id = ++lastId
  }
}

describe('IOC container', () => {
  let registry: Registry

  let container: Container

  beforeEach(() => {
    registry = new Registry()
    container = new Container(registry)
  })

  describe('registry', () => {
    it('should have a working copy constructor', () => {
      const serviceA = sinon.stub().returns('A')
      registry.bind('A', serviceA)
      const reg2 = new Registry(registry)
      expect(reg2.get('A').factory).toBe(serviceA)
    })
  })

  it('should resolve bound services and their dependencies', () => {
    const serviceA = sinon.stub().returns('A')
    const serviceB = sinon.stub().returns('B')
    const serviceC = sinon.stub().returns('C')

    registry.bind('A', serviceA)
    registry.bind('B', serviceB, ['A', 'C'])
    registry.bind('C', serviceC)

    expect(container.resolve('A')).toBe('A')
    expect(container.resolve('B')).toBe('B')
    expect(container.resolve('C')).toBe('C')

    expect(serviceA.called).toBe(true)
    expect(serviceB.calledWith('A', 'C')).toBe(true)
    expect(serviceC.called).toBe(true)
  })

  it('should resolve bound services and their dependencies without explicitly resolving dependencies', () => {
    const serviceA = sinon.stub().returns('A')
    const serviceB = sinon.stub().returns('B')
    const serviceC = sinon.stub().returns('C')

    registry.bind('A', serviceA)
    registry.bind('B', serviceB, ['A'])
    registry.bind('C', serviceC)

    expect(container.resolve('B')).toBe('B')

    expect(serviceA.called).toBe(true)
    expect(serviceB.calledWith('A')).toBe(true)
    expect(serviceC.called).toBe(false)
  })

  it('should resolve dependencies to arbitrary depth', () => {
    const stubs = []

    for (let i: number = 0; i < 10; i++) {
      const str = i.toString()
      const deps = i < 9 ? [`${i + 1}`] : []
      const stub = sinon.stub().returns(str)
      stubs.push(stub)
      registry.bind(str, stub, deps)
    }

    for (let i: number = 0; i < 10; i++) {
      const str = i.toString()
      expect(container.resolve(str)).toBe(str)

      if (i < 9) {
        expect(stubs[i].calledWith(`${i + 1}`)).toBe(true)
      } else {
        expect(stubs[i].called).toBe(true)
      }
    }
  })

  it('should cache singleton instances whether resolved or as dependencies', () => {
    const depStub = sinon.stub()
    registry.bind('A', () => new InstanceCounter())
    registry.bind('B', depStub, ['A'])
    const firstResolution = container.resolve<InstanceCounter>('A')
    expect(container.resolve<InstanceCounter>('A').id).toBe(firstResolution.id)
    container.resolve('B')
    expect((depStub.lastCall.args[0] as InstanceCounter).id).toBe(firstResolution.id)
  })

  it('should create new instance for non-singleton services', () => {
    registry.bind('A', () => new InstanceCounter(), [], false)
    const firstResolution = container.resolve<InstanceCounter>('A')
    expect(container.resolve<InstanceCounter>('A').id).toBe(firstResolution.id + 1)
  })

  it('should throw an error when binding duplicate services', () => {
    registry.bind('A', () => 'A')

    expect(() => {
      registry.bind('A', () => 'A')
    }).toThrow()
  })

  it('should throw an error when resolving nonexistent services, even in dependencies', () => {
    registry.bind('B', () => 'B', ['A'])

    expect(() => {
      container.resolve('A')
    }).toThrow()

    expect(() => {
      container.resolve('B')
    }).toThrow()
  })

  it('should throw an error when cyclic dependencies exist', () => {
    registry.bind('A', () => 'A', ['A'])
    registry.bind('B', () => 'B', ['C'])
    registry.bind('C', () => 'C', ['B'])

    expect(() => {
      container.resolve('A')
    }).toThrow()

    expect(() => {
      container.resolve('B')
    }).toThrow()

    registry.clear()
    container.clear()

    registry.bind('A', () => 'A', ['B'])
    registry.bind('B', () => 'B', ['C'])
    registry.bind('C', () => 'C', ['D'])
    registry.bind('D', () => 'D', ['A'])

    expect(() => {
      container.resolve('A')
    }).toThrow()
  })
})
