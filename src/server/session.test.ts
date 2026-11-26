import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "./session";

describe("session cookie", () => {
  it("round-trips and rejects tampering and expiry", () => {
    const v = encodeSession({ staffId: "s1", orgId: "o1", role: "owner" }, 1_000_000);
    expect(decodeSession(v, 1_000_000)?.role).toBe("owner");
    const [p, mac] = v.split(".");
    const forged = Buffer.from(JSON.stringify({ staffId: "s1", orgId: "o1", role: "owner", exp: 9e12 })).toString("base64url");
    expect(decodeSession(`${forged}.${mac}`, 1_000_000)).toBeNull();
    expect(decodeSession(`${p}.x`, 1_000_000)).toBeNull();
    expect(decodeSession(v, 1_000_000 + 8 * 86_400_000)).toBeNull();
  });
});
