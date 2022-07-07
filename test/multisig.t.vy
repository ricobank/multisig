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
    threshold: uint256 = 2
    members: DynArray[address, 3] = []
    members.append(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
    members.append(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
    members.append(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
    chain_id: uint256 = 1
    args: Bytes[256] = _abi_encode(threshold, members, chain_id)
    self.msig = Multisig(self.snek.make('Multisig', 'multisig', args))

@external
def test_init():
    assert self.msig != empty(Multisig)
    assert self.msig.nonce() == 0
    assert self.msig.is_member(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
    assert self.msig.is_member(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
    assert self.msig.is_member(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)

# @external
# def test_fail_high_threshold():
#     threshold: uint256 = 4
#     members: DynArray[address, 3] = []
#     members.append(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
#     members.append(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
#     members.append(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
#     chain_id: uint256 = 1
#     args: Bytes[256] = _abi_encode(threshold, members, chain_id)
#     self.msig = Multisig(self.snek.make('Multisig', 'multisig2', args))
