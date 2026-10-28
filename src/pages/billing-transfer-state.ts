/** Prevent selecting a removed or unverified account in the customer notification form. */
export function hasSelectedBankAccount(accounts: ReadonlyArray<{ id: string }>, selectedId: string): boolean {
  return selectedId !== "" && accounts.some((account) => account.id === selectedId);
}
