# Introduction

Welcome to Machinomy library API! You can use the library to provide micropayments in ETH and ERC20 tokens. It could
be freely embedded into your software both in browser and server environments.

The library implements unidirectional payment channel pattern. It works like a bar tab. A sender opens a channel
and deposits the funds there. Over time she sends promised payments to a receiver. A promised payment is a signed data structure
that the receiver could redeem at the smart contract. 
