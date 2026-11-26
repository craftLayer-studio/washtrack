# WashTrack

**Tagline:** Every garment tagged, every customer updated. Run your laundry from one phone.

**Vertical:** Laundries, dry cleaners, laundromats, ironing (press) shops, shoe and bag care studios.

## The one-line pitch

Each garment, shoe or bag gets a QR tag at intake, with photos of existing stains or damage. Customers get automatic WhatsApp updates (received, in process, ready, out for delivery) and pay by UPI link. Pickups and deliveries get a route list. Monthly plans turn one-off customers into prepaid regulars, and photo proof settles "you damaged my shirt" disputes.

## Who it is for (ICP)

| Attribute | Ideal customer |
|---|---|
| Business | Independent dry cleaner / laundry storefront, or a small 2–3 store brand with one workshop |
| Volume | 300–2,000 orders a month; ₹1.5–10 lakh monthly revenue |
| Location | Tier 1–2 cities, residential + office catchments |
| Owner | Uses paper challan books or a basic billing app; takes pickup requests on WhatsApp/phone |
| Trigger | Lost or mixed-up garments, damage disputes, customers calling "is it ready?", pickups missed |

## Top features

| Priority | Feature | Metric it moves |
|---|---|---|
| P0 | QR tag per item + intake photos | Retention (fewer losses and disputes) |
| P0 | Automatic WhatsApp status updates with bill and UPI link | Activation, retention |
| P0 | Per-item and per-kg price list, billing, dues | Activation |
| P0 | Scan-to-update status in store/workshop | Retention |
| P1 | Pickup and delivery scheduling, rider app, route list | ARPU (Growth plan) |
| P1 | Monthly plans and prepaid wallets | ARPU, retention for the business |
| P1 | Damage/loss dispute workflow with photo evidence | Retention |
| P1 | Repeat-customer CRM, win-back offers, Google review requests | Retention, referral |
| P2 | Multi-store + plant mode, corporate/hostel accounts | ARPU |

## Pricing (summary)

| Plan | INR | USD (approx., ₹88/USD estimate) | For |
|---|---|---|---|
| Starter | ₹599/month or ₹5,999/year | ~$6.8 / ~$68 | Single counter, up to 300 orders/month |
| Growth | ₹1,299/month or ₹12,999/year | ~$14.8 / ~$148 | Pickup and delivery, monthly plans, campaigns; up to 1,000 orders/month |
| Plant | ₹2,999/month or ₹29,999/year | ~$34 / ~$341 | Up to 3 counters + 1 workshop |

QR tag rolls, thermal printers and message top-ups are add-ons. Detail: [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md).

## Why now

- India laundry services market about US$2.7 bn in 2025 and dry cleaning about US$1.38 bn (IMARC). Sources in [docs/04-market-research.md](docs/04-market-research.md).
- Consumer commissions regularly hold dry cleaners liable for damaged garments, and printed "no responsibility" disclaimers have failed in court. Intake photos are the cheapest defence.
- The incumbent Indian tool (QDC) lists WhatsApp automation as a paid add-on on its higher plan; WashTrack makes WhatsApp the default.

## Status

**MVP, demo data, simulated messaging and payments.** The app runs end to end with a fictional demo business (Fresh Fold Laundry & Dry Cleaners, Hyderabad). WhatsApp and SMS go to an outbox table shown in the app; payments are UPI intent links plus staff-recorded cash/UPI/card. No third-party calls, no API keys.

Product URL: https://washtrack.craftlayer.store · Support: washtrack@craftlayer.store

## How to run

Requirements: Node 20.9+ and pnpm 11 (`corepack enable`).

```bash
pnpm install
cp .env.example .env.local   # optional; defaults work for local dev
pnpm dev                     # http://localhost:3000 (next dev --webpack)
```

The first start creates a PGlite database in `./.data/pglite`, applies the migrations and seeds the demo business. `pnpm db:seed` does the same without starting the app. Delete `.data/` to start fresh. Set `DATABASE_URL` to use Postgres instead (node-postgres; migrations run on start).

Set `APP_URL` to the address people open (QR codes and WhatsApp links are built from it). Production needs `SESSION_SECRET` (32+ characters).

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (webpack) |
| `pnpm build && pnpm start` | Production build and server |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | Quality gates (CI runs the same) |
| `pnpm exec astryx doctor --built .` | Astryx design-system check |
| `pnpm db:generate` | Generate a SQL migration after editing `src/server/db/schema.ts` |
| `pnpm db:seed` | Seed the demo business into an empty dev database |

## Demo walkthrough

1. Open `/` and choose **Try the demo**.
2. **Staff sign-in** at `/login`: pick Owner (98480 11001), Counter (98480 11002) or Rider (98480 11003). The OTP is shown on screen, labelled demo.
3. **Intake** at `/app/intake`: type a phone (try 97012 34504, a plan customer), add items (shirt, saree, suit, shoes, kg loads), express, discount, unticked consent boxes. Create the order.
4. On the **order page** (`/app/orders/<id>`): add photos and condition notes per tag, record the customer's acknowledgement, **Print tags** (`/print/tags/<id>`), collect cash/UPI, schedule delivery.
5. **Scan** at `/app/scan`: type or camera-scan a tag code; each scan moves the item forward (received, washing, ironing, ready, delivered). When the whole order is ready, the pickup alert lands in the **WhatsApp outbox** (`/app/messages`).
6. **Customer view**: the tracking link `/o/<token>` (also behind every tag QR, `/tag/<code>`) shows stages, intake photos, bill, a UPI pay button, "I've paid", delivery request, problem report and consent switches.
7. **Pickup booking**: the shop QR (`/print/shop-qr`) opens `/s/<token>`, where a customer books a pickup with separate, unticked consent boxes. It appears on **Pickups & route** (`/app/routes`), sorted by slot and area, with the amount to collect.
8. **Plans** at `/app/plans`; sell one from a customer profile (`/app/customers/<id>`). Plan balance is used automatically at intake.
9. **Owner dashboard** at `/app/dashboard`: orders by stage, overdue, revenue today/month, dues, repeat customers, follow-up results. Send a win-back offer from `/app/messages` (only to marketing opt-ins). **Settings & QR** at `/app/settings`: shop details, UPI ID, price list, team.

## Features: built vs planned

| Feature | Status |
|---|---|
| Price list (24 seeded items, per piece / per kg / per pair, express prices), owner editing | Built |
| Customer lookup by phone (E.164), history, dues, preferences | Built |
| Intake with a QR tag per item (one per piece/pair, one per kg load), printable tag sheet | Built |
| Intake photos per tag, condition notes, customer acknowledgement | Built |
| Billing: per piece/kg, express, discount, plan coverage, server-side totals | Built (GST invoice: planned) |
| WhatsApp updates: received, ready, out for delivery, delivered, payment, reminders | Built (simulated adapter + outbox) |
| Scan-to-update stages with order roll-up and wrong-order guard | Built |
| Payments: UPI intent link + QR, cash, card, part payments, dues | Built (gateway webhook: planned) |
| Consent log (DPDP): two purposes, unticked, notice version, channel, opt-out on order page | Built |
| Customer tracking page via link or tag QR; pickup booking via shop QR | Built |
| Pickup and delivery scheduling, daily route list | Built (geocoded routing: planned) |
| Monthly plans (pieces or kg), auto-deduct at intake | Built (renewal reminders, wallets: planned) |
| Owner dashboard; win-back / plan offers with results | Built |
| Staff phone + OTP sign-in, roles (owner, staff, rider) | Built (OTP via simulated SMS) |
| Handover check scanning every tag | Partly: delivery needs every item ready; per-tag handover scan planned |
| Dispute module, Google review requests, multi-store/plant mode, regional languages | Planned (P1/P2) |

## Documents

| File | Contents |
|---|---|
| [AGENTS.md](AGENTS.md) | Brief for AI agents |
| [docs/01-product-plan.md](docs/01-product-plan.md) | Vision, personas, journeys, features by phase, data model, metrics |
| [docs/02-problems-and-benefits.md](docs/02-problems-and-benefits.md) | Problem, solution, benefit per stakeholder |
| [docs/03-pros-cons-risks.md](docs/03-pros-cons-risks.md) | Pros, cons, risks, kill criteria |
| [docs/04-market-research.md](docs/04-market-research.md) | Market, competitors, pricing, trends, regulation, sources |
| [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md) | Tiers, add-ons, unit economics, scenarios |
| [docs/06-go-to-market-and-onboarding.md](docs/06-go-to-market-and-onboarding.md) | Channels, script, objections, onboarding, retention |

Shared platform modules are described in [core/README.md](https://github.com/craftLayer-studio/craftlayer-core/blob/main/README.md).

## Licence

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). Personal, educational, research and non-profit use is free. **Any commercial use requires a paid licence or written permission from CraftLayer Studio.** See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

Part of the [CraftLayer Products](https://github.com/craftLayer-studio/craftlayer-products) portfolio.
