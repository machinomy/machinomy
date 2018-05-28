export interface IEnv {
  MACHINOMY_NETWORK?: string
  CONTRACT_ADDRESS?: string
}

/* tslint:disable */
export function container (): IEnv {
  if (typeof global !== 'undefined') {
    return global as IEnv
  } else if (typeof window !== 'undefined') {
    return window as IEnv
  } else if (typeof process !== 'undefined' && typeof process.env === 'object') {
    return process.env
  } else {
    return {}
  }
}
/* tslint:enable */
