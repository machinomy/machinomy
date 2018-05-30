# Contract verification

To display contract source code on etherscan you need to verify it:
1. [ropsten](https://ropsten.etherscan.io/verifyContract)
2. [kovan](https://kovan.etherscan.io/verifyContract)

Use [truffle-flattener](https://github.com/alcuadrado/truffle-flattener) to get flattened solidity contract code.

Code example for constructor arguments encoding into ABI:

```js
var abi = require('ethereumjs-abi')
var parameterTypes = ["uint32"];
var parameterValues = [42]
var encoded = abi.rawEncode(parameterTypes, parameterValues);
console.log(encoded.toString('hex'));
```
