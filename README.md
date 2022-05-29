## `ricobank/multisig`

This is a tiny multisig contract.

It is a "detatched multisig", that means signers can sign the
message off-chain and submit one transaction with all signatures.

It comes with a tiny program called `msig` for managing multisig
objects, actions, and signatures.

It was inspired by [simple-multisig](https://github.com/christianlundkvist/simple-multisig/).

## plan of attack

```
- install vyper
- install anvil
- write enough of snek.js to compile, deploy a contract, and call a function on it
- write basic test harness
- - every vyper file that ends with `.t.vy` is a VM test
- - - deploy the contract, snapshot  (TODO: setup issues, see https://github.com/vyperlang/vyper/issues/2883)
- - - call each function that starts with `test`, restore state after each
- - - tests pass if they don't revert, you can use `assert` in vyper
- - - if test object emits `echo()` then next event from test must equal next event from target
- - every js file that ends with `.t.js` is a test
- - - deploy every contract, snapshot
- - - run every js test file, restore state after each
- - - - provide deployed objects to test file's `globalThis`
```