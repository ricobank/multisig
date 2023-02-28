const ethers = require("ethers");

module.exports = helpers = {}

helpers.createDomainSeparator = (domain_type_hash, name_hash, version_hash, chain_id, address, salt) => {
    const domain_data = domain_type_hash
        + name_hash.slice(2)
        + version_hash.slice(2)
        + ethers.utils.hexlify(chain_id).slice(2).padStart(64, '0')
        + address.slice(2).padStart(64, '0')
        + salt.slice(2)
    return ethers.utils.keccak256(domain_data.toLowerCase())
}

helpers.createTransactionHash = (tx_type_hash, target_address, amount, data, nonce, expiry, gate) => {
    let tx_input = tx_type_hash
        + target_address.slice(2).padStart(64, '0')
        + ethers.utils.hexlify(amount).slice(2).padStart(64, '0')
        + ethers.utils.keccak256(data).slice(2)
        + ethers.utils.hexlify(nonce).slice(2).padStart(64, '0')
        + ethers.utils.hexlify(expiry).slice(2).padStart(64, '0')
        + ethers.utils.hexlify(gate).slice(2).padStart(64, '0')
    return ethers.utils.keccak256(tx_input.toLowerCase())
}
