@external
@payable
def __init__():
    pass

@external
@payable
def burn(wad: uint256):
    send(empty(address), wad)

@external
@payable
def __default__():
    pass
