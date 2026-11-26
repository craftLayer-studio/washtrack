import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db/client";
import { StoreError } from "./store/errors";
import { getStaff } from "./store/auth";
import { SESSION_COOKIE, decodeSession, type Role } from "./session";

export interface Actor {
  staffId: string;
  orgId: string;
  role: Role;
  name: string;
  orgName: string;
  isDemo: boolean;
}

/** Current staff member from the signed session cookie, re-checked against the database. */
export async function currentActor(): Promise<Actor | null> {
  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const db = await getDb();
  const member = await getStaff(db, session.staffId);
  if (!member || member.orgId !== session.orgId) return null;
  return { staffId: member.id, orgId: member.orgId, role: member.role, name: member.name, orgName: member.orgName, isDemo: member.isDemo };
}

/** For route handlers: throws 401/403 as a StoreError. */
export async function requireActor(roles: readonly Role[] = ["owner", "staff", "rider"]): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) throw new StoreError(401, "Please sign in");
  if (!roles.includes(actor.role)) throw new StoreError(403, "Your role can't do this");
  return actor;
}

/** For pages: redirects to sign-in, or to the app home when the role is not allowed. */
export async function pageActor(roles: readonly Role[] = ["owner", "staff", "rider"], next = "/app"): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!roles.includes(actor.role)) redirect(actor.role === "rider" ? "/app/routes" : "/app");
  return actor;
}
