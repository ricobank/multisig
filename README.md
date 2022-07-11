## `ricobank/multisig`

**🚨 WARNING: This repo is a pre-release, it has not been audited.**

This is a tiny multisig contract.

It is a "detatched multisig", which means signers can sign the
message off-chain and submit one transaction with all signatures.
It was inspired by [simple-multisig](https://github.com/christianlundkvist/simple-multisig/).

The primary design goal of this contract, after correctness, is *understandability*.
We want an average ethereum developer to be able to convince themselves that it is
correct in a reasonable amount of time. The contract is less than 100 lines of commented vyper code.



