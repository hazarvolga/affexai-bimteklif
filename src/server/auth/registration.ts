export type RegistrationIntent = 'workspace' | 'academy';

export interface RegistrationInput {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  intent: RegistrationIntent;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRegistrationInput(value: unknown): RegistrationInput | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (body.intent !== undefined && body.intent !== 'workspace' && body.intent !== 'academy') return null;
  const intent: RegistrationIntent = body.intent === 'academy' ? 'academy' : 'workspace';
  const email = typeof body.email === 'string' ? body.email.trim().toLocaleLowerCase('en-US') : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '';
  const submittedCompanyName = typeof body.companyName === 'string' ? body.companyName.trim().replace(/\s+/g, ' ') : '';
  if (email.length > 254 || !emailPattern.test(email)) return null;
  if (password.length < 8 || password.length > 128) return null;
  if (fullName.length < 2 || fullName.length > 120) return null;
  if (submittedCompanyName.length > 160 || (intent === 'workspace' && submittedCompanyName.length < 2)) return null;
  return {
    email,
    password,
    fullName,
    companyName: submittedCompanyName || `${fullName} Academy`,
    intent,
  };
}

export function publicRegisteredUser<T extends { id: unknown; email: unknown; fullName: unknown; createdAt: unknown }>(user: T) {
  return { id: user.id, email: user.email, fullName: user.fullName, createdAt: user.createdAt };
}
