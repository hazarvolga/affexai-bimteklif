export function safeAcademyReturnPath(value: string | null | undefined): string | null {
  if (!value || value.length > 240) return null;
  return /^\/app\/quotes\/[0-9a-f-]{36}$/i.test(value) ? value : null;
}
