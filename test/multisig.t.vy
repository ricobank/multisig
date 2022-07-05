interface Snek:
    def make(typename: String[32], objectname: String[32], args: Bytes[3200]) -> address: nonpayable
    def echo(target: address): nonpayable
    def rand(set: uint256) -> uint256: nonpayable

interface Multisig:
    def exec(v: DynArray[uint256, 16], r: DynArray[uint256, 16], s: DynArray[uint256, 16], target: address, amount: uint256, data: Bytes[2000], executor: address): nonpayable
    def __default__(): payable
    def members(arg0: uint256) -> address: view
    def is_member(arg0: address) -> bool: view
    def nonce() -> uint256: view
    def threshold() -> uint256: view

event Received:
    source: indexed(address)
    value:  indexed(uint256)

event Executed:
    sender: indexed(address)
    target: indexed(address)
    value:  uint256
    data:   Bytes[2000]

msig: public(Multisig)
snek: public(Snek)

@external
def __init__(snek: Snek):
    self.snek = snek
    threshold: uint256 = 4
    members: address[4] = [empty(address), empty(address), empty(address), empty(address)]
    chain_id: uint256 = 1
    args: Bytes[1920] = _abi_encode(threshold, members, chain_id)
    self.msig = Multisig(self.snek.make('Multisig', 'msig1', args))

@external
def testBasics():
    a: uint256 = 3
    b: uint256 = 3
    assert a == b
