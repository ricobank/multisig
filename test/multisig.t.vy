## SPDX-License-Identifier: MIT

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
    args: Bytes[256] = _abi_encode(threshold, members)
    self.msig = Multisig(self.snek.make('Multisig', 'multisig', args))

@external
def test_init():
    assert self.msig != empty(Multisig)
    assert self.msig.nonce() == 0
    assert self.msig.is_member(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
    assert self.msig.is_member(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
    assert self.msig.is_member(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)

@external
def test_throw_high_threshold():
    threshold: uint256 = 3
    members: DynArray[address, 3] = []
    members.append(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
    members.append(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
    args: Bytes[256] = _abi_encode(threshold, members)
    self.msig = Multisig(self.snek.make('Multisig', 'multisig2', args))

@external
def test_throw_repeat_addresses():
    threshold: uint256 = 1
    members: DynArray[address, 3] = []
    members.append(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
    members.append(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
    args: Bytes[256] = _abi_encode(threshold, members)
    self.msig = Multisig(self.snek.make('Multisig', 'multisig2', args))

@external
def test_throw_address_order():
    threshold: uint256 = 3
    members: DynArray[address, 3] = []
    members.append(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
    members.append(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
    members.append(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
    args: Bytes[256] = _abi_encode(threshold, members)
    self.msig = Multisig(self.snek.make('Multisig', 'multisig2', args))

@external
def test_throw_too_many_members():
    threshold: uint256 = 1
    members: DynArray[address, 17] = []
    members.append(0x108472dF509296383C536dc1B6309ccAd9479fAC)
    members.append(0x11e35dC86ee56A9D79490BE255161D2D66681FAe)
    members.append(0x12FdF28ae6DCC07Fe5648f5D56f3Db10926bCD5c)
    members.append(0x13a9250BDbe3e3D86D8e0c6292301eE5bb8c1891)
    members.append(0x140803c0a731a9549eBB126bF5889391BE4F122D)
    members.append(0x152bADa9cB66EdcB1735B53C6b7ed9b476a58244)
    members.append(0x16c1F63b2EE26D0f389Ac28f93aF1FF12Fe7D174)
    members.append(0x17e69cB089B8e193dA21552963384cF68f53d92c)
    members.append(0x18de09194490D625FC0D03f2902d7882144FCa33)
    members.append(0x1986b5324C78609b7E9f829Ad26cC46372f2e571)
    members.append(0x201704eAFA17CD1dB8ee8B772AdE90752F345378)
    members.append(0x214743B543Ab35bD93619dC88Cc88933aa94a32c)
    members.append(0x22a9dE1876aA57884B1e58AecA9dB331DdF6B4C2)
    members.append(0x233FbE10951AbfB9c52C63C4d90A42278592824d)
    members.append(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
    members.append(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
    members.append(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
    args: Bytes[700] = _abi_encode(threshold, members)
    self.msig = Multisig(self.snek.make('Multisig', 'multisig2', args))
