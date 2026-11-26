import { randomBytes, randomInt } from "node:crypto";

/** Crockford-style alphabet without 0/O/1/I/L so tags read cleanly when typed by hand. */
const TAG_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

/** 10-character random tag code (~49 bits). Printed on the garment tag and encoded in its QR. */
export function newTagCode(): string {
  let out = "";
  for (let i = 0; i < 10; i++) out += TAG_ALPHABET[randomInt(TAG_ALPHABET.length)];
  return out;
}

/** Unguessable token for public links (order tracking, shop QR). */
export function newToken(): string {
  return randomBytes(16).toString("base64url");
}

export function isTagCode(value: string): boolean {
  return /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/.test(value);
}

export function isToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(value);
}

export function newOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
