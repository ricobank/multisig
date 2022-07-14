## SPDX-License-Identifier: MIT

## EIP712 Precomputed hashes:
EIP712DOMAINTYPE_HASH: constant(bytes32) = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
NAME_HASH:             constant(bytes32) = keccak256("tiny multisig")
VERSION_HASH:          constant(bytes32) = keccak256("1")
TXTYPE_HASH:           constant(bytes32) = keccak256("MultiSigTransaction(address destination,uint256 value,bytes data,uint256 nonce, uint256 expiry)")
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
          expiry: uint256
        ):
    assert len(v) == len(r) \
       and len(r) == len(s) \
       and len(s) == self.threshold, 'err/num_sigs'

    txn_hash: bytes32 = keccak256(_abi_encode(TXTYPE_HASH, target, amount, keccak256(data), self.nonce, expiry))
    sum_hash: bytes32 = keccak256(concat(convert('\x19\x01', Bytes[2]), DOMAIN_SEPARATOR, txn_hash))
    msg_hash: bytes32 = self.prefix(sum_hash)
    last:     address = empty(address)

    assert expiry >= block.timestamp or expiry == 0, 'err/expied'

    for i in range(MAX_OWNERS):
        if i >= self.threshold:
            break
        addr: address = ecrecover(msg_hash, v[i], r[i], s[i])
        assert convert(addr, uint160) > convert(last, uint160), 'err/owner_order'
        assert self.is_member[addr], 'err/not_member'
        last = addr

    self.nonce += 1
    raw_call(target, data, value=amount)  # Default is revert on failure
    log Executed(msg.sender, target, amount, data)

@external
@payable
def __default__():
    log Received(msg.sender, msg.value)
