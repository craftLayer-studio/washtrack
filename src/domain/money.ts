/**
 * Money is always an integer number of paise (1 rupee = 100 paise).
 * Never store rupees as floats.
 */
export type Paise = number;

export function assertPaise(value: number, label = "amount"): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of paise, got ${value}`);
  }
}

export function rupees(amount: number): Paise {
  return Math.round(amount * 100);
}

/** Percent of an amount, rounded half-up to the nearest paisa. */
export function percentOf(amount: Paise, percent: number): Paise {
  if (!Number.isFinite(percent) || percent < 0) {
    throw new Error(`percent must be a non-negative number, got ${percent}`);
  }
  return Math.round((amount * percent) / 100);
}

/** Format paise as Indian rupees, e.g. 123456 -> "₹1,234.56", 50000 -> "₹500". */
export function formatINR(amount: Paise): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const grouped = groupIndian(whole);
  const text = fraction === 0 ? grouped : `${grouped}.${String(fraction).padStart(2, "0")}`;
  return `${negative ? "-" : ""}₹${text}`;
}

/** Indian digit grouping: 1234567 -> "12,34,567". */
function groupIndian(n: number): string {
  const s = String(n);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}
