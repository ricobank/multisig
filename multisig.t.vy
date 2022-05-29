import multisig as Multisig

ms : Multisig

@external
def __init__(ms : address):
    self.ms = Multisig(ms)

@external
def testBasics():
    assert self.ms != convert(0, Multisig)