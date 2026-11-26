import { and, asc, eq } from "drizzle-orm";
import { isValidVpa, type Paise, type Service, type Unit } from "@/domain";
import type { Db } from "../db/client";
import { orgs, outbox, priceItems, staff } from "../db/schema";
import { desc } from "drizzle-orm";
import { StoreError, notFound } from "./errors";
import { newId } from "./ids";
import { parsePhone } from "./customers";

export async function listPriceItems(db: Db, orgId: string, includeInactive = false) {
  const where = includeInactive ? eq(priceItems.orgId, orgId) : and(eq(priceItems.orgId, orgId), eq(priceItems.active, true));
  return db.select().from(priceItems).where(where).orderBy(asc(priceItems.sort), asc(priceItems.name));
}

export interface PriceItemInput {
  name: string;
  category: string;
  service: Service;
  unit: Unit;
  price: Paise;
  expressPrice: Paise | null;
}

function checkPrice(input: PriceItemInput) {
  if (!input.name.trim()) throw new StoreError(400, "Item name is required");
  if (!Number.isInteger(input.price) || input.price <= 0 || input.price > 10_000_000) throw new StoreError(400, "Price must be between ₹0.01 and ₹1,00,000");
  if (input.expressPrice !== null && (!Number.isInteger(input.expressPrice) || input.expressPrice < input.price)) throw new StoreError(400, "Express price must be at least the normal price");
}

export async function addPriceItem(db: Db, orgId: string, input: PriceItemInput) {
  checkPrice(input);
  const [row] = await db
    .insert(priceItems)
    .values({ id: newId("pri"), orgId, name: input.name.trim().slice(0, 60), category: input.category.trim().slice(0, 40) || "Other", service: input.service, unit: input.unit, price: input.price, expressPrice: input.expressPrice, sort: 999 })
    .returning();
  return row;
}

export async function updatePriceItem(db: Db, orgId: string, id: string, patch: { price: Paise; expressPrice: Paise | null; active: boolean }) {
  const [item] = await db.select().from(priceItems).where(and(eq(priceItems.orgId, orgId), eq(priceItems.id, id)));
  if (!item) throw notFound("Price item");
  checkPrice({ ...item, price: patch.price, expressPrice: patch.expressPrice });
  await db.update(priceItems).set(patch).where(and(eq(priceItems.orgId, orgId), eq(priceItems.id, id)));
}

export async function updateOrgSettings(db: Db, orgId: string, input: { name: string; address: string; city: string; phone: string; upiVpa: string; turnaroundHours: number }) {
  if (!input.name.trim()) throw new StoreError(400, "Shop name is required");
  if (!isValidVpa(input.upiVpa)) throw new StoreError(400, "Enter a valid UPI ID, like shopname@okaxis");
  if (!Number.isInteger(input.turnaroundHours) || input.turnaroundHours < 2 || input.turnaroundHours > 240) throw new StoreError(400, "Turnaround must be 2 to 240 hours");
  await db
    .update(orgs)
    .set({ name: input.name.trim().slice(0, 80), address: input.address.trim().slice(0, 200), city: input.city.trim().slice(0, 60), phone: parsePhone(input.phone), upiVpa: input.upiVpa, turnaroundHours: input.turnaroundHours })
    .where(eq(orgs.id, orgId));
}

export async function listStaff(db: Db, orgId: string) {
  return db.select().from(staff).where(eq(staff.orgId, orgId)).orderBy(asc(staff.role), asc(staff.name));
}

export async function addStaff(db: Db, orgId: string, input: { name: string; phone: string; role: "owner" | "staff" | "rider" }) {
  if (!input.name.trim()) throw new StoreError(400, "Name is required");
  const phone = parsePhone(input.phone);
  const [existing] = await db.select().from(staff).where(and(eq(staff.orgId, orgId), eq(staff.phone, phone)));
  if (existing) throw new StoreError(409, "This number is already on your team");
  const [row] = await db.insert(staff).values({ id: newId("stf"), orgId, phone, name: input.name.trim().slice(0, 60), role: input.role }).returning();
  return row;
}

export async function listOutbox(db: Db, orgId: string, limit = 100) {
  return db.select().from(outbox).where(eq(outbox.orgId, orgId)).orderBy(desc(outbox.createdAt)).limit(limit);
}
