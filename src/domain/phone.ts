/**
 * Indian mobile numbers in E.164 (+91 followed by 10 digits starting 6-9).
 * Accepts common inputs: "98765 43210", "+91-98765-43210", "09876543210".
 */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let rest = digits;
  if (rest.startsWith("+91")) rest = rest.slice(3);
  else if (rest.startsWith("+")) return null;
  else if (rest.length === 12 && rest.startsWith("91")) rest = rest.slice(2);
  else if (rest.length === 11 && rest.startsWith("0")) rest = rest.slice(1);
  if (!/^[6-9]\d{9}$/.test(rest)) return null;
  return `+91${rest}`;
}

/** "+919876543210" -> "+91 98765 43210" */
export function formatPhone(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** Show only the last 4 digits, for public pages. */
export function maskPhone(e164: string): string {
  return `+91 ••••• •${e164.slice(-4)}`;
}
