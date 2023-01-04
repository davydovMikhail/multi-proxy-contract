/* global ethers */
function getSelectors (contract) {
  const signatures = Object.keys(contract.interface.functions)
  const selectors = signatures.reduce((acc, val) => {
      acc.push(contract.interface.getSighash(val))
    return acc
  }, [])
  selectors.contract = contract
  return selectors
}

exports.getSelectors = getSelectors