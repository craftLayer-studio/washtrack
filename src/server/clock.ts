/** Current time in epoch ms. Pages read time through here so the value is clearly request-scoped. */
export function serverNow(): number {
  return Date.now();
}
