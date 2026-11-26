/** Every tagged item moves forward through these stages. Order status is rolled up from its items. */
export const STAGES = ["received", "washing", "ironing", "ready", "delivered"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  received: "Received",
  washing: "Washing / cleaning",
  ironing: "Ironing / finishing",
  ready: "Ready",
  delivered: "Delivered",
};

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

/** The stage a scan moves an item to, or null when it is already delivered. */
export function nextStage(stage: Stage): Stage | null {
  const i = stageIndex(stage);
  return i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export class StageError extends Error {}

/**
 * Validate moving one item from `from` to `to`.
 * Items only move forward. Skipping is allowed (shoes skip ironing), except that
 * "delivered" needs the item to be ready first, so nothing leaves the shop unfinished.
 */
export function assertTransition(from: Stage, to: Stage): void {
  if (stageIndex(to) <= stageIndex(from)) {
    throw new StageError(`Item is already ${STAGE_LABEL[from].toLowerCase()}; stages only move forward`);
  }
  if (to === "delivered" && from !== "ready") {
    throw new StageError("Only ready items can be handed over");
  }
}

/** An order is as far along as its least advanced item. */
export function rollUpStage(itemStages: readonly Stage[]): Stage {
  if (itemStages.length === 0) return "received";
  return itemStages.reduce((min, s) => (stageIndex(s) < stageIndex(min) ? s : min));
}

/** True when this change makes the whole order ready (the moment to send the pickup alert). */
export function becameReady(before: readonly Stage[], after: readonly Stage[]): boolean {
  return rollUpStage(before) !== "ready" && rollUpStage(after) === "ready";
}

/** True when the order is due and not yet ready. */
export function isOverdue(stage: Stage, dueAt: number, now: number): boolean {
  return stageIndex(stage) < stageIndex("ready") && dueAt < now;
}
