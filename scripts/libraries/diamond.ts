/* global ethers */
import { Contract } from "ethers";

export function getSelectors (contract: Contract): string[] {
  const signatures = Object.keys(contract.interface.functions)
  const selectors = signatures.reduce((acc: string[], val: string) => {
      acc.push(contract.interface.getSighash(val))
    return acc
  }, []);
  return selectors
}