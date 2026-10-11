export const DISABLED_GRAPHILE_CRONTAB = '# cron intentionally disabled; jobs are queue-driven';

export function withDisabledGraphileCron<T extends object>(options: T): T & { crontab: string } {
  return { ...options, crontab: DISABLED_GRAPHILE_CRONTAB };
}
