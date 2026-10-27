import { validateAuthEmailEnvironment } from "../auth/email-policy";
import { uploadQuotaLimits } from "../../smartcheck/import/upload-quota";
import { readIfcEnvironmentLimits } from './ifc-limits';
import { validateControlDatabaseUrls } from '../../db/control-plane';
type Env = Record<string, string | undefined>;

const placeholderSecret = (value: string) => /^(change-me|super-secret|secret|password)/i.test(value.trim());
const validHttpsUrl = (value: string) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

export function validateSmartcheckStorageEnvironment(env: Env = process.env) {
  const errors: string[] = [];
  if (!env.SMARTCHECK_S3_BUCKET) errors.push('SMARTCHECK_S3_BUCKET is required when SmartCheck production storage is enabled.');
  if (!env.SMARTCHECK_S3_REGION) errors.push('SMARTCHECK_S3_REGION is required when SmartCheck production storage is enabled.');
  if (env.SMARTCHECK_S3_ENDPOINT && !validHttpsUrl(env.SMARTCHECK_S3_ENDPOINT)) errors.push('SMARTCHECK_S3_ENDPOINT must be HTTPS when provided.');
  if (Boolean(env.SMARTCHECK_S3_ACCESS_KEY_ID) !== Boolean(env.SMARTCHECK_S3_SECRET_ACCESS_KEY)) errors.push('SMARTCHECK_S3_ACCESS_KEY_ID and SMARTCHECK_S3_SECRET_ACCESS_KEY must be provided together.');
  if (env.SMARTCHECK_S3_REQUIRE_STATIC_CREDENTIALS === 'true' && (!env.SMARTCHECK_S3_ACCESS_KEY_ID?.trim() || !env.SMARTCHECK_S3_SECRET_ACCESS_KEY?.trim())) errors.push('Explicit S3 access key and secret are required for this deployment.');
  if (env.SMARTCHECK_S3_FORCE_PATH_STYLE && !['true', 'false'].includes(env.SMARTCHECK_S3_FORCE_PATH_STYLE)) errors.push('SMARTCHECK_S3_FORCE_PATH_STYLE must be true or false.');
  return { valid: errors.length === 0, errors };
}

export function validateProductionEnvironment(
  env: Env = process.env,
  options: { requireControlDatabase?: boolean } = {},
) {
  const requireControlDatabase = options.requireControlDatabase ?? true;
  const errors: string[] = [];
  if (env.NODE_ENV !== 'production') return { valid: true, errors, trustProxyHops: 0 };
  try { readIfcEnvironmentLimits(env); }
  catch (error) { errors.push(error instanceof Error ? error.message : 'INVALID_IFC_LIMIT'); }
  try { uploadQuotaLimits(env); } catch { errors.push('UPLOAD_QUOTA_CONFIG_INVALID'); }
  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required.');
  if (requireControlDatabase) {
    if (!env.CONTROL_DATABASE_URL) errors.push('CONTROL_DATABASE_URL is required.');
    if (env.DATABASE_URL && env.CONTROL_DATABASE_URL) {
      try { validateControlDatabaseUrls(env.DATABASE_URL, env.CONTROL_DATABASE_URL); }
      catch (error) { errors.push(error instanceof Error ? error.message : 'CONTROL_DATABASE_URL_INVALID'); }
    }
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || placeholderSecret(env.JWT_SECRET)) errors.push('JWT_SECRET must be a non-placeholder secret of at least 32 characters.');
  } else {
    if (env.CONTROL_DATABASE_URL) {
      errors.push('CONTROL_DATABASE_URL must not be provided to worker processes.');
    }
    if (env.JWT_SECRET && (env.JWT_SECRET.length < 32 || placeholderSecret(env.JWT_SECRET))) {
      errors.push('JWT_SECRET must be a non-placeholder secret of at least 32 characters.');
    }
  }
  if (!env.PUBLIC_APP_URL || !validHttpsUrl(env.PUBLIC_APP_URL)) errors.push('PUBLIC_APP_URL must be an absolute HTTPS URL.');
  errors.push(...validateAuthEmailEnvironment(env));
  if (env.SMARTCHECK_IMPORT_ENABLED === 'true') {
    if (!env.SMARTCHECK_PILOT_COMPANY_IDS) errors.push('SMARTCHECK_PILOT_COMPANY_IDS is required when SmartCheck import is enabled in production.');
  }
  if (env.SMARTCHECK_IMPORT_ENABLED === 'true' || env.SMARTCHECK_S3_REQUIRE_STATIC_CREDENTIALS === 'true') {
    errors.push(...validateSmartcheckStorageEnvironment(env).errors.map((error) => error.replace('when SmartCheck production storage is enabled', 'when SmartCheck import is enabled in production')));
  }
  const trustProxyHops = Number(env.TRUST_PROXY_HOPS ?? '1');
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 1 || trustProxyHops > 3) errors.push('TRUST_PROXY_HOPS must be an integer from 1 to 3.');
  return { valid: errors.length === 0, errors, trustProxyHops: Number.isInteger(trustProxyHops) ? trustProxyHops : 1 };
}

export function assertProductionEnvironment(
  env: Env = process.env,
  options: { requireControlDatabase?: boolean } = {},
) {
  const result = validateProductionEnvironment(env, options);
  if (!result.valid) throw new Error(`Production configuration invalid:\n- ${result.errors.join('\n- ')}`);
  return result;
}
