## SPDX-License-Identifier: MIT

struct Bolt:
    dest: address
    data: Bytes[2000]
    size: uint256
    show: uint256
    gate: bool

## EIP712 Precomputed hashes:
EIP712DOMAINTYPE_HASH: constant(bytes32) = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
NAME_HASH:             constant(bytes32) = keccak256("tiny multisig")
VERSION_HASH:          constant(bytes32) = keccak256("1")
TXTYPE_HASH:           constant(bytes32) = keccak256("MultiSigTransaction(address destination,uint256 value,bytes data,uint256 nonce,uint256 expiry, bool gate)")
SALT:                  constant(bytes32) = 0x129d390a401694aef5508ae83353e4124512a4c5bf5b10995b62abe1fb85b650
MAX_OWNERS:            constant(uint256) = 16
DOMAIN_SEPARATOR:      immutable(bytes32)

event Received:
    source: indexed(address)
    amount: indexed(uint256)
event Loaded:
    nonce: indexed(uint256)
    dest:  indexed(address)
    size:  uint256
    data:  Bytes[2000]
event Executed:
    nonce: indexed(uint256)
    dest:  indexed(address)
    size:  uint256
    data:  Bytes[2000]

members:   public(DynArray[address, MAX_OWNERS])
is_member: public(HashMap[address, bool])
line:      public(HashMap[uint256, Bolt])
wait:      public(uint256)
next:      public(uint256)
nonce:     public(uint256)
threshold: public(uint256)

@external
def __init__( threshold: uint256,
              members: DynArray[address, MAX_OWNERS],
              chain_id: uint256,
              wait: uint256
            ):
    assert len(members) <= MAX_OWNERS, 'err/max_owners'
    assert len(members) >= threshold, 'err/min_owners'
    assert threshold > 0, 'err/min_threshold'
    last: address = empty(address)
    for owner in members:
        assert convert(owner, uint160) > convert(last, uint160), 'err/owner_order'
        self.is_member[owner] = True
        last = owner
    self.members = members
    self.threshold = threshold
    self.wait = wait
    DOMAIN_SEPARATOR = keccak256(_abi_encode(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH, chain_id, self, SALT))

@external
@payable
def load(v: DynArray[uint256, MAX_OWNERS], r: DynArray[uint256, MAX_OWNERS], s: DynArray[uint256, MAX_OWNERS],
         dest: address, size: uint256, data: Bytes[2000], expiry: uint256, gate: bool):
    assert expiry >= block.timestamp, 'err/expired'
    assert len(v) == len(r) \
       and len(r) == len(s) \
       and len(s) == self.threshold, 'err/num_sigs'
    txn_hash: bytes32 = keccak256(_abi_encode(TXTYPE_HASH, dest, size, keccak256(data), self.nonce, expiry, gate))
    sum_hash: bytes32 = keccak256(concat(convert('\x19\x01', Bytes[2]), DOMAIN_SEPARATOR, txn_hash))
    msg_hash: bytes32 = keccak256(concat(convert("\x19Ethereum Signed Message:\n32", Bytes[32]), sum_hash))
    last:     address = empty(address)
    for i in range(MAX_OWNERS):
        if i >= self.threshold:
            break
        addr: address = ecrecover(msg_hash, v[i], r[i], s[i])
        assert convert(addr, uint160) > convert(last, uint160), 'err/owner_order'
        assert self.is_member[addr], 'err/not_member'
        last = addr
    self.line[self.nonce] = Bolt({dest: dest, data: data, size: size, show: block.timestamp + self.wait, gate: gate})
    log Loaded(self.nonce, dest, size, data)
    self.nonce += 1

@external
@payable
def fire():
    bolt: Bolt = self.line[self.next]
    assert block.timestamp > bolt.show, 'err/wait'
    assert bolt.show != 0, 'err/empty'
    self.line[self.next] = empty(Bolt)
    log Executed(self.next, bolt.dest, bolt.size, bolt.data)
    self.next += 1
    if bolt.gate:
        raw_call(bolt.dest, bolt.data, max_outsize=0, value=bolt.size, is_delegate_call=True,  revert_on_failure=False)
    else:
        raw_call(bolt.dest, bolt.data, max_outsize=0, value=bolt.size, is_delegate_call=False, revert_on_failure=False)

@external
@payable
def __default__():
    log Received(msg.sender, msg.value)
