import { getDb } from "@/server/db/client";
import { BadRequest, handle, oneOf, readBody } from "@/server/http";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { StoreError } from "@/server/store/errors";
import { isToken } from "@/server/store/ids";
import { updateConsentByToken } from "@/server/store/public";
import { CONSENT_PURPOSES } from "@/domain";

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    const { token } = await ctx.params;
    if (!isToken(token)) throw new StoreError(404, "Order not found");
    if (!rateLimit(`consent:${clientIp(request)}`, 20, 10 * 60_000)) throw new StoreError(429, "Too many requests. Try again later.");
    const body = await readBody(request);
    if (typeof body.granted !== "boolean") throw new BadRequest("granted must be true or false");
    return updateConsentByToken(await getDb(), token, oneOf(body, "purpose", CONSENT_PURPOSES), body.granted);
  });
}
