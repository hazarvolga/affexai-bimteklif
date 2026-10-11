type Environment = Record<string, string | undefined>;

function integer(env: Environment, key: string, fallback: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER) {
  const raw = env[key];
  const value = raw === undefined ? fallback : /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`INVALID_IFC_LIMIT: ${key}`);
  return value;
}

export function readIfcEnvironmentLimits(env: Environment = process.env) {
  return {
    // Match the upload/parser hard ceiling; configuration cannot bypass it.
    maxFileBytes: integer(env, 'SMARTCHECK_MAX_IFC_FILE_MB', 100, 1, 100) * 1024 * 1024,
    maxConcurrent: integer(env, 'SMARTCHECK_IFC_MAX_CONCURRENT', 2, 1),
    monthlyLimit: env.SMARTCHECK_IFC_MONTHLY_LIMIT === undefined ? null : integer(env, 'SMARTCHECK_IFC_MONTHLY_LIMIT', 0, 0),
  };
}
