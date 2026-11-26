import { getDb } from "@/server/db/client";
import { handle, oneOf, optStr, readBody } from "@/server/http";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { StoreError } from "@/server/store/errors";
import { isToken } from "@/server/store/ids";
import { raiseRequest } from "@/server/store/public";

/** Customer on the tracking page: "I paid by UPI", "please deliver", "problem with an item". */
export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    const { token } = await ctx.params;
    if (!isToken(token)) throw new StoreError(404, "Order not found");
    if (!rateLimit(`req:${clientIp(request)}`, 15, 10 * 60_000)) throw new StoreError(429, "Too many requests. Try again later.");
    const body = await readBody(request);
    return raiseRequest(await getDb(), token, oneOf(body, "kind", ["upi_paid", "delivery", "issue"] as const), optStr(body, "message", 500) ?? "");
  });
}
