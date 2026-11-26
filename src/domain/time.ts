/** India Standard Time is UTC+5:30 all year (no daylight saving). */
export const IST_OFFSET_MINUTES = 330;
const DAY_MS = 86_400_000;
const OFFSET_MS = IST_OFFSET_MINUTES * 60_000;

/** Epoch ms of the most recent midnight in IST. */
export function startOfIstDay(now: number): number {
  return Math.floor((now + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS;
}

/** Calendar date in IST as YYYY-MM-DD. */
export function istDate(now: number): string {
  return new Date(now + OFFSET_MS).toISOString().slice(0, 10);
}

/** Add whole days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  if (!isIsoDate(date)) throw new Error(`Invalid date: ${date}`);
  const t = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value;
}

/** Epoch ms for a given IST date and hour (0-23). */
export function istDateTime(date: string, hour: number, minute = 0): number {
  if (!isIsoDate(date)) throw new Error(`Invalid date: ${date}`);
  return Date.parse(`${date}T00:00:00Z`) + (hour * 60 + minute) * 60_000 - OFFSET_MS;
}

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });

/** e.g. "Thu, 26 Nov, 6:00 pm" in IST. */
export function formatIst(ms: number): string {
  return dateTimeFmt.format(new Date(ms));
}

export function formatIstDate(ms: number): string {
  return dateFmt.format(new Date(ms));
}
