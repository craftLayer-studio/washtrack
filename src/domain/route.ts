/** Pickup and delivery slots, in the order a rider works through the day. */
export const SLOTS = ["morning", "afternoon", "evening"] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABEL: Record<Slot, string> = {
  morning: "Morning 9–12",
  afternoon: "Afternoon 12–4",
  evening: "Evening 4–8",
};

export const JOB_KINDS = ["pickup", "delivery"] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export interface RouteStop {
  id: string;
  slot: Slot;
  area: string;
  createdAt: number;
}

/**
 * Daily route list: by slot, then grouped by area (alphabetical, so nearby stops sit together),
 * then by booking time. Real geocoded routing is a later integration.
 */
export function sortRoute<T extends RouteStop>(stops: readonly T[]): T[] {
  return [...stops].sort(
    (a, b) =>
      SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) ||
      a.area.localeCompare(b.area, "en-IN", { sensitivity: "base" }) ||
      a.createdAt - b.createdAt,
  );
}
