const util = require('ethereumjs-util')

export interface SignatureParts {
  v: number,
  r: string,
  s: string
}

export default class Signature {
  private rpcSig: string

  constructor (rpcSig: string) {
    this.rpcSig = rpcSig
  }

  public static fromRpcSig (rpcSig: string) {
    return new Signature(rpcSig)
  }

  public static fromParts (parts: SignatureParts) {
    const serialized = util.toRpcSig(parts.v, util.toBuffer(parts.r), util.toBuffer(parts.s))
    return new Signature(serialized)
  }

  public toString () {
    return this.rpcSig
  }

  public toParts (): SignatureParts {
    const parts = util.fromRpcSig(this.rpcSig)

    return {
      v: parts.v,
      r: `0x${parts.r.toString('hex')}`,
      s: `0x${parts.s.toString('hex')}`
    }
  }

  public isEqual (other: Signature): boolean {
    return this.toString() === other.toString()
  }
}
