import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey();
const orgId = () => text("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().default(sql`now()`);
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const orgs = pgTable("orgs", {
  id: id(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  upiVpa: text("upi_vpa").notNull(),
  /** Unguessable token in the shop QR (pickup booking page). */
  shopToken: text("shop_token").notNull().unique(),
  orderPrefix: text("order_prefix").notNull(),
  nextOrderNo: integer("next_order_no").notNull().default(1001),
  turnaroundHours: integer("turnaround_hours").notNull().default(48),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const staff = pgTable(
  "staff",
  {
    id: id(),
    orgId: orgId(),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["owner", "staff", "rider"] }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("staff_org_phone").on(t.orgId, t.phone), index("staff_phone").on(t.phone)],
);

export const otpChallenges = pgTable("otp_challenges", {
  id: id(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

export const priceItems = pgTable(
  "price_items",
  {
    id: id(),
    orgId: orgId(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    service: text("service", { enum: ["dry_clean", "wash_fold", "wash_iron", "press", "shoe_care", "bag_care"] }).notNull(),
    unit: text("unit", { enum: ["piece", "kg", "pair"] }).notNull(),
    price: integer("price").notNull(),
    expressPrice: integer("express_price"),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("price_items_org").on(t.orgId)],
);

export const customers = pgTable(
  "customers",
  {
    id: id(),
    orgId: orgId(),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    area: text("area").notNull().default(""),
    preferences: text("preferences").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("customers_org_phone").on(t.orgId, t.phone)],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: id(),
    orgId: orgId(),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    purpose: text("purpose", { enum: ["service_updates", "marketing"] }).notNull(),
    granted: boolean("granted").notNull(),
    noticeVersion: text("notice_version").notNull(),
    channel: text("channel", { enum: ["counter", "qr_page", "whatsapp", "staff_app"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("consent_customer").on(t.orgId, t.customerId)],
);

export const plans = pgTable("plans", {
  id: id(),
  orgId: orgId(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["pieces", "kg"] }).notNull(),
  quota: integer("quota").notNull(),
  price: integer("price").notNull(),
  periodDays: integer("period_days").notNull().default(30),
  active: boolean("active").notNull().default(true),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    orgId: orgId(),
    customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull().references(() => plans.id),
    balance: integer("balance").notNull(),
    startsAt: ts("starts_at").notNull(),
    renewsAt: ts("renews_at").notNull(),
    paymentMethod: text("payment_method", { enum: ["upi", "cash", "card"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("subs_customer").on(t.orgId, t.customerId)],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orgId: orgId(),
    code: text("code").notNull(),
    /** Unguessable token for the public tracking page. */
    trackToken: text("track_token").notNull().unique(),
    customerId: text("customer_id").notNull().references(() => customers.id),
    channel: text("channel", { enum: ["counter", "pickup"] }).notNull().default("counter"),
    deliveryMode: text("delivery_mode", { enum: ["collect", "delivery"] }).notNull().default("collect"),
    express: boolean("express").notNull().default(false),
    dueAt: ts("due_at").notNull(),
    stage: text("stage", { enum: ["received", "washing", "ironing", "ready", "delivered"] }).notNull().default("received"),
    subtotal: integer("subtotal").notNull(),
    planCovered: integer("plan_covered").notNull().default(0),
    subscriptionId: text("subscription_id").references(() => subscriptions.id),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull(),
    paid: integer("paid").notNull().default(0),
    note: text("note").notNull().default(""),
    /** Customer acknowledged the recorded pre-existing damage at intake. */
    damageAckAt: ts("damage_ack_at"),
    damageAckName: text("damage_ack_name"),
    createdBy: text("created_by").references(() => staff.id),
    readyAt: ts("ready_at"),
    deliveredAt: ts("delivered_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("orders_org_code").on(t.orgId, t.code), index("orders_org_stage").on(t.orgId, t.stage), index("orders_customer").on(t.orgId, t.customerId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orgId: orgId(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    priceItemId: text("price_item_id").references(() => priceItems.id),
    name: text("name").notNull(),
    service: text("service").notNull(),
    unit: text("unit", { enum: ["piece", "kg", "pair"] }).notNull(),
    /** Quantity this tag covers: 1 for pieces/pairs, grams for a kg load. */
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    amount: integer("amount").notNull(),
    tagCode: text("tag_code").notNull().unique(),
    stage: text("stage", { enum: ["received", "washing", "ironing", "ready", "delivered"] }).notNull().default("received"),
    damageNote: text("damage_note").notNull().default(""),
    seq: integer("seq").notNull(),
    updatedAt: ts("updated_at").notNull().default(sql`now()`),
  },
  (t) => [index("items_order").on(t.orgId, t.orderId)],
);

export const photos = pgTable(
  "photos",
  {
    id: id(),
    orgId: orgId(),
    orderItemId: text("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
    /** Compressed JPEG data URL (MVP storage; object storage later). */
    dataUrl: text("data_url").notNull(),
    kind: text("kind", { enum: ["intake", "after"] }).notNull().default("intake"),
    takenBy: text("taken_by").references(() => staff.id),
    createdAt: createdAt(),
  },
  (t) => [index("photos_item").on(t.orgId, t.orderItemId)],
);

export const stageEvents = pgTable(
  "stage_events",
  {
    id: id(),
    orgId: orgId(),
    orderItemId: text("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
    fromStage: text("from_stage"),
    toStage: text("to_stage").notNull(),
    staffId: text("staff_id").references(() => staff.id),
    createdAt: createdAt(),
  },
  (t) => [index("events_item").on(t.orgId, t.orderItemId)],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orgId: orgId(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }),
    method: text("method", { enum: ["upi", "cash", "card"] }).notNull(),
    amount: integer("amount").notNull(),
    reference: text("reference").notNull().default(""),
    staffId: text("staff_id").references(() => staff.id),
    createdAt: createdAt(),
  },
  (t) => [index("payments_org").on(t.orgId, t.createdAt)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: id(),
    orgId: orgId(),
    customerId: text("customer_id").notNull().references(() => customers.id),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["pickup", "delivery"] }).notNull(),
    date: text("date").notNull(),
    slot: text("slot", { enum: ["morning", "afternoon", "evening"] }).notNull(),
    address: text("address").notNull(),
    area: text("area").notNull(),
    note: text("note").notNull().default(""),
    status: text("status", { enum: ["scheduled", "done", "cancelled"] }).notNull().default("scheduled"),
    source: text("source", { enum: ["staff", "qr_page"] }).notNull().default("staff"),
    createdAt: createdAt(),
  },
  (t) => [index("jobs_org_date").on(t.orgId, t.date)],
);

export const outbox = pgTable(
  "outbox",
  {
    id: id(),
    orgId: orgId(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: ["whatsapp", "sms", "email"] }).notNull().default("whatsapp"),
    toAddress: text("to_address").notNull(),
    template: text("template").notNull(),
    purpose: text("purpose", { enum: ["service_updates", "marketing", "auth"] }).notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ["simulated_sent", "blocked_no_consent"] }).notNull(),
    campaignId: text("campaign_id"),
    orderId: text("order_id"),
    createdAt: createdAt(),
  },
  (t) => [index("outbox_org").on(t.orgId, t.createdAt)],
);

export const campaigns = pgTable("campaigns", {
  id: id(),
  orgId: orgId(),
  template: text("template").notNull(),
  offer: text("offer").notNull(),
  audience: text("audience").notNull(),
  sent: integer("sent").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  createdAt: createdAt(),
});

/** Things a customer raises from the public order page: "I paid by UPI", "deliver it", "problem with an item". */
export const requests = pgTable(
  "requests",
  {
    id: id(),
    orgId: orgId(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["upi_paid", "delivery", "issue"] }).notNull(),
    message: text("message").notNull().default(""),
    status: text("status", { enum: ["open", "resolved"] }).notNull().default("open"),
    createdAt: createdAt(),
    resolvedAt: ts("resolved_at"),
  },
  (t) => [index("requests_org").on(t.orgId, t.status)],
);
