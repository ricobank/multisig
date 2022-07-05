## SPDX-License-Identifier: MIT

# TODO update these values 
# EIP712 Precomputed hashes:
# keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
EIP712DOMAINTYPE_HASH: constant(bytes32) = 0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472
# keccak256("Simple MultiSig")
NAME_HASH:             constant(bytes32) = 0xb7a0bfa1b79f2443f4d73ebb9259cddbcd510b18be6fc4da7d1aa7b1786e73e6
# keccak256("1")
VERSION_HASH:          constant(bytes32) = 0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6
# keccak256("MultiSigTransaction(address destination,uint256 value,bytes data,uint256 nonce,address executor,uint256 gasLimit)")
TXTYPE_HASH:           constant(bytes32) = 0x3ee892349ae4bbe61dce18f95115b5dc02daf49204cc602458cd4c1f540d56d7
SALT:                  constant(bytes32) = 0x251543af6a222378665a76fe38dbceae4871a070b7fdaf5c6c30cf758dc33cc0
MAX_OWNERS:            constant(uint256) = 16
DOMAIN_SEPARATOR:      immutable(bytes32)

event Received:
    source: indexed(address)
    value:  indexed(uint256)

event Executed:
    sender: indexed(address)
    target: indexed(address)
    value:  uint256
    data:   Bytes[2000]

members:   public(DynArray[address, MAX_OWNERS])
is_member: public(HashMap[address, bool])
nonce:     public(uint256)
threshold: public(uint256)

@external
def __init__(threshold: uint256, members: DynArray[address, MAX_OWNERS], chain_id: uint256):
    assert len(members) <= MAX_OWNERS\
       and len(members) >= threshold\
       and threshold > 0, 'Config err'
    last: address = empty(address)
    for owner in members:
        assert convert(owner, uint160) > convert(last, uint160), 'Order err'
        self.is_member[owner] = True
        last = owner
    self.members = members
    self.threshold = threshold
    DOMAIN_SEPARATOR = keccak256(_abi_encode(EIP712DOMAINTYPE_HASH, NAME_HASH, VERSION_HASH, chain_id, self, SALT))

@pure
@internal
def prefix(hash: bytes32) -> bytes32:
    return keccak256(_abi_encode('\x19Ethereum Signed Message:\n32', hash))

@external
def exec(v: DynArray[uint256, MAX_OWNERS],
         r: DynArray[uint256, MAX_OWNERS],
         s: DynArray[uint256, MAX_OWNERS],
         target: address,
         amount: uint256,
         data: Bytes[2000],
         executor: address):
    assert len(v) == len(r)\
       and len(r) == len(s)\
       and len(s) == self.threshold, 'Num sigs err'
    assert executor == msg.sender or executor == empty(address), 'Executor err'

    tx_hash:    bytes32 = keccak256(_abi_encode(TXTYPE_HASH, target, amount, keccak256(data), self.nonce, executor))
    total_hash: bytes32 = keccak256(concat(convert('\x19\x01', Bytes[2]), DOMAIN_SEPARATOR, tx_hash))
    message:    bytes32 = self.prefix(total_hash)
    last:       address = empty(address)

    for i in range(MAX_OWNERS):
        if i >= self.threshold:
            break
        addr: address = ecrecover(message, v[i], r[i], s[i])
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
