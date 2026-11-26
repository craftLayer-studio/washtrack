/** Astryx DateInput's ISO date string type. */
export type IsoDate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;
export const iso = (s: string) => s as IsoDate;
