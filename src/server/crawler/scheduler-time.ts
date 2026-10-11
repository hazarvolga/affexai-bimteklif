export const CRAWLER_TIMEZONE = 'Europe/Istanbul';
const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CRAWLER_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
function parts(date: Date) {
  const values = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second };
}
function instant(year: number, month: number, day: number, hour: number): Date {
  const target = Date.UTC(year, month - 1, day, hour);
  let candidate = target;
  for (let pass = 0; pass < 3; pass++) {
    const local = parts(new Date(candidate));
    const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    candidate += target - represented;
  }
  return new Date(candidate);
}
export function crawlerDayStart(now: Date): Date {
  const local = parts(now);
  return instant(local.year, local.month, local.day, 0);
}
export function crawlerScheduleDue(now: Date): boolean {
  const local = parts(now);
  return local.hour === 3 && local.minute < 20;
}
export function nextCrawlerRun(now: Date): Date {
  const local = parts(now);
  const today = instant(local.year, local.month, local.day, 3);
  return today.getTime() > now.getTime() ? today : instant(local.year, local.month, local.day + 1, 3);
}
