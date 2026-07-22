type Env = Record<string, string | undefined>;

const placeholderSecret = (value: string) => /^(change-me|super-secret|secret|password)/i.test(value.trim());
const validHttpsUrl = (value: string) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

export function validateProductionEnvironment(env: Env = process.env) {
  const errors: string[] = [];
  if (env.NODE_ENV !== 'production') return { valid: true, errors, trustProxyHops: 0 };
  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required.');
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || placeholderSecret(env.JWT_SECRET)) errors.push('JWT_SECRET must be a non-placeholder secret of at least 32 characters.');
  if (!env.PUBLIC_APP_URL || !validHttpsUrl(env.PUBLIC_APP_URL)) errors.push('PUBLIC_APP_URL must be an absolute HTTPS URL.');
  if (!env.AUTH_EMAIL_WEBHOOK_URL || !validHttpsUrl(env.AUTH_EMAIL_WEBHOOK_URL)) errors.push('AUTH_EMAIL_WEBHOOK_URL must be an absolute HTTPS URL.');
  if (!env.AUTH_EMAIL_WEBHOOK_SECRET || env.AUTH_EMAIL_WEBHOOK_SECRET.length < 32 || placeholderSecret(env.AUTH_EMAIL_WEBHOOK_SECRET)) errors.push('AUTH_EMAIL_WEBHOOK_SECRET must be a non-placeholder secret of at least 32 characters.');
  const trustProxyHops = Number(env.TRUST_PROXY_HOPS ?? '1');
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 1 || trustProxyHops > 3) errors.push('TRUST_PROXY_HOPS must be an integer from 1 to 3.');
  return { valid: errors.length === 0, errors, trustProxyHops: Number.isInteger(trustProxyHops) ? trustProxyHops : 1 };
}

export function assertProductionEnvironment(env: Env = process.env) {
  const result = validateProductionEnvironment(env);
  if (!result.valid) throw new Error(`Production configuration invalid:\n- ${result.errors.join('\n- ')}`);
  return result;
}
