import { getDb } from "@/server/db/client";
import { bool, handle, oneOf, optStr, readBody, str } from "@/server/http";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { StoreError } from "@/server/store/errors";
import { isToken } from "@/server/store/ids";
import { bookPickup } from "@/server/store/public";
import { SLOTS } from "@/domain";

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    const { token } = await ctx.params;
    if (!isToken(token)) throw new StoreError(404, "Shop not found");
    if (!rateLimit(`book:${clientIp(request)}`, 5, 10 * 60_000)) throw new StoreError(429, "Too many bookings from this device. Please call the shop.");
    const body = await readBody(request);
    return bookPickup(await getDb(), token, {
      phone: str(body, "phone", 20),
      name: str(body, "name", 80),
      address: str(body, "address", 300),
      area: str(body, "area", 80),
      date: str(body, "date", 10),
      slot: oneOf(body, "slot", SLOTS),
      note: optStr(body, "note", 200),
      serviceUpdates: bool(body, "serviceUpdates"),
      marketing: bool(body, "marketing"),
    });
  });
}
