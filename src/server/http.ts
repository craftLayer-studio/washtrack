import { StoreError } from "./store/errors";

/** Run a store call and turn the result or a StoreError into a JSON response. */
export async function handle(fn: () => unknown): Promise<Response> {
  try {
    return Response.json(await fn(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof StoreError || err instanceof BadRequest) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export class BadRequest extends Error {
  readonly status = 400;
}

const MAX_BODY_BYTES = 16_000;

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new BadRequest("Request too large");
  let value: unknown;
  try {
    value = text ? JSON.parse(text) : {};
  } catch {
    throw new BadRequest("Body must be JSON");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new BadRequest("Body must be a JSON object");
  return value as Record<string, unknown>;
}

export function str(body: Record<string, unknown>, key: string, max = 200): string {
  const v = body[key];
  if (typeof v !== "string" || v.length === 0 || v.length > max) throw new BadRequest(`${key} is required`);
  return v;
}

export function optStr(body: Record<string, unknown>, key: string, max = 500): string | undefined {
  const v = body[key];
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || v.length > max) throw new BadRequest(`${key} must be text up to ${max} characters`);
  return v;
}

export function num(body: Record<string, unknown>, key: string): number {
  const v = body[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new BadRequest(`${key} must be a number`);
  return v;
}

export function oneOf<T extends string>(body: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = body[key];
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new BadRequest(`${key} must be one of ${allowed.join(", ")}`);
  return v as T;
}

export function int(body: Record<string, unknown>, key: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const v = body[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) throw new BadRequest(`${key} must be a whole number from ${min} to ${max}`);
  return v;
}

export function bool(body: Record<string, unknown>, key: string): boolean {
  const v = body[key];
  if (v === undefined) return false;
  if (typeof v !== "boolean") throw new BadRequest(`${key} must be true or false`);
  return v;
}

/** Read a larger JSON body (photo uploads). */
export async function readLargeBody(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > maxBytes) throw new BadRequest("Request too large");
  try {
    const v = text ? JSON.parse(text) : {};
    if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new BadRequest("Body must be a JSON object");
  }
}
