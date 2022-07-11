## SPDX-License-Identifier: MIT

## EIP712 Precomputed hashes:
 # keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
EIP712DOMAINTYPE_HASH: constant(bytes32) = 0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472
 # keccak256("tiny multisig")
NAME_HASH:             constant(bytes32) = 0xe463279c76a26a807fc93adcd7da8c78758960944d3dd615283d0a9fa20efdc6
 # keccak256("1")
VERSION_HASH:          constant(bytes32) = 0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6
 # keccak256("MultiSigTransaction(address destination,uint256 value,bytes data,uint256 nonce,address executor)")
TXTYPE_HASH:           constant(bytes32) = 0x77a02b8d4d89821b65796d535cba07669f292aede4f4a6e17753e6e3d2499732
SALT:                  constant(bytes32) = 0x129d390a401694aef5508ae83353e4124512a4c5bf5b10995b62abe1fb85b650
MAX_OWNERS:            constant(uint256) = 16
DOMAIN_SEPARATOR:      immutable(bytes32)

event Received:
    source: indexed(address)
    amount: indexed(uint256)

event Executed:
    sender: indexed(address)
    target: indexed(address)
    amount: uint256
    data:   Bytes[2000]

members:   public(DynArray[address, MAX_OWNERS])
is_member: public(HashMap[address, bool])
nonce:     public(uint256)
threshold: public(uint256)

@external
def __init__( threshold: uint256,
              members: DynArray[address, MAX_OWNERS],
              chain_id: uint256
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
    DOMAIN_SEPARATOR = keccak256(_abi_encode(
        EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH, chain_id, self, SALT
    ))

@pure
@internal
def prefix(hash: bytes32) -> bytes32:
    return keccak256(concat(convert("\x19Ethereum Signed Message:\n32", Bytes[32]), hash))

@external
def exec( v: DynArray[uint256, MAX_OWNERS],
          r: DynArray[uint256, MAX_OWNERS],
          s: DynArray[uint256, MAX_OWNERS],
          target: address, amount: uint256,
          data: Bytes[2000],
          executor: address
        ):
    assert len(v) == len(r) \
       and len(r) == len(s) \
       and len(s) == self.threshold, 'Num sigs err'
    assert executor == msg.sender or executor == empty(address), 'Executor err'

    txn_hash: bytes32 = keccak256(_abi_encode(TXTYPE_HASH, target, amount, keccak256(data), self.nonce, executor))
    sum_hash: bytes32 = keccak256(concat(convert('\x19\x01', Bytes[2]), DOMAIN_SEPARATOR, txn_hash))
    msg_hash: bytes32 = self.prefix(sum_hash)
    last:     address = empty(address)

    for i in range(MAX_OWNERS):
        if i >= self.threshold:
            break
        addr: address = ecrecover(msg_hash, v[i], r[i], s[i])
        assert convert(addr, uint160) > convert(last, uint160), 'Order err'
        assert self.is_member[addr], 'Member err'
        last = addr

    self.nonce += 1
    raw_call(target, data, value=amount)
    log Executed(msg.sender, target, amount, data)

@external
@payable
def __default__():
    log Received(msg.sender, msg.value)
