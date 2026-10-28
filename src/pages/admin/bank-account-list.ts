export function removeBankAt<T>(accounts: readonly T[], index: number): T[] {
  return accounts.filter((_, position) => position !== index);
}
