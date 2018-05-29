import * as ethUnits from 'ethereumjs-units'
import * as BigNumber from 'bignumber.js'

namespace Units {
  export function convert (value: number | BigNumber.BigNumber, fromUnit: string, toUnit: string): BigNumber.BigNumber {
    let stringNumber = ethUnits.convert(value.toString(), fromUnit, toUnit)
    return new BigNumber.BigNumber(stringNumber)
  }
}

export default Units
