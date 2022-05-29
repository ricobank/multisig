
import { test } from 'tapzero'


/*

compile all files
start up anvil

for each file that ends with `.vy`
  deploy it
snapshot EVM
for each file that ends with `.t.vy`
  for each function that starts with `test`
    call it
      if reverts, fail the test
      if emits `echo()`, assert next test and target events are equal
    restore EVM snapshot

(restored snapshot)
globalThis.objs = deployed object pack
globalThis.test = tapzero.test
globalThis.test.beforeEach = ()=> restore EVM snapshot
for each file that ends with `test.js`
  require it (this runs the tapzero tests)

*/
