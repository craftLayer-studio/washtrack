# WashTrack product plan

## Vision

Every neighbourhood laundry runs like a branded chain: no lost garments, no "is it ready?" calls, no unpaid dues, and a base of prepaid monthly customers.

## Positioning

| Against | WashTrack's angle |
|---|---|
| Paper challan books | Item-level QR tracking, photos, automatic updates; same speed at the counter |
| QDC (Quick Dry Cleaning) | Phone-first, WhatsApp updates included in every plan, simpler setup, lower entry price |
| Generic billing apps (Vyapar, myBillBook) | Built for item intake, tags, status and pickups, not accounting |
| Global tools (CleanCloud, Starchup) | Priced in INR for Indian storefronts; WhatsApp-native |
| Franchise brands (Tumbledry, UClean) | Gives independents the chain's customer experience without a 6–7.5% royalty |

## Personas

| Persona | Description | Job to be done |
|---|---|---|
| Owner (buyer) | Imran, 40, runs a dry cleaner in Hyderabad with 1 counter, 4 staff, ~800 orders a month (estimate) | "Stop losing garments and arguing about damage; get paid on time; keep customers coming back" |
| Counter staff | Takes intake, prints tags, hands over | "Fast intake, no confusion at handover" |
| Workshop staff | Washes, irons, packs | "Know which items belong to which order and what is urgent" |
| Rider | Pickups and deliveries | "A route list in order, with what to collect" |
| End customer | Working professional or family within 3–5 km | "Know when it is ready, pay online, get pickup at home, trust my expensive clothes are safe" |

## Core user journeys

1. **Counter intake.** Staff searches or adds customer by phone. Adds items from the price list (shirt, trouser, saree, suit, blanket, shoes, bag) with service type. For each item, the app prints or assigns a QR tag. Staff photographs any stain, tear or premium item (one tap per photo). Express flag and due date set. Bill generated.
2. **Customer notified.** WhatsApp utility template: "Received 7 items at Fresh Press. Bill ₹640, ready by Thu 6 pm. Photos and bill: <link>. Pay: <UPI link>." The first message includes the consent notice; marketing consent is a separate opt-in.
3. **In process.** Workshop scans tag at each stage (washing, pressing, packed). Order status rolls up automatically when all items are packed. Mismatched items (tag scanned into wrong order) raise an alert.
4. **Ready.** WhatsApp template: "Your order is ready. Collect or reply 1 for delivery." A customer reply opens a 24-hour service window, so the delivery-slot conversation costs no template charge.
5. **Pickup and delivery.** Rider app shows today's list sorted by area/route, with collect amount. Delivery confirmed by customer OTP or doorstep photo.
6. **Dispute.** Customer reports damage. Owner opens the item record: intake photos, timestamps, staff. Choose outcome (rework, discount, compensation within policy, reject with evidence). The message to the customer includes the intake photo.
7. **Repeat.** After 30 days without an order, a win-back offer goes to opted-in customers. Regulars are offered a monthly plan.

## Features by phase

### Phase 1: MVP, sellable in 6–8 weeks (P0)

Build status (2026-11-26): the MVP in this repo covers the rows marked **Built**. Messaging and payments use simulated adapters; see the README.

| Feature | Detail | Metric | Core module |
|---|---|---|---|
| Onboarding wizard + price list templates — **Built (seeded price list + owner editing; no wizard yet)** | Prefilled list of ~80 common items and services; owner edits prices | Activation | Onboarding wizard |
| Customer lookup by phone — **Built** | History, dues, preferences (starch, fold vs hanger) | Activation | CRM |
| Intake with QR tag per item — **Built (printable tag sheet)** | Bluetooth thermal printer label or pre-printed tag scan | Retention | QR engine |
| Intake photos — **Built** | Per item, stored with timestamp; compressed | Retention (dispute defence) | Storage |
| Billing — **Built (no GST invoice yet)** | Per piece, per kg, express surcharge, discounts, GST invoice if registered | Activation | Payments |
| WhatsApp updates — **Built (simulated outbox)** | Received (with bill + photo link), ready; optional in-process/out-for-delivery | Retention | Messaging |
| Scan-to-update status — **Built (fixed stages)** | Stages configurable; order roll-up | Retention | Staff app |
| Payments — **Built (UPI intent link, cash, card, dues)** | UPI link, cash, card; dues ledger | Revenue for owner | Payments |
| Handover check — **Partly built** | Scan every tag at handover; warns on missing item | Retention | Staff app |
| Dashboard — **Built** | Today's intake, ready-not-collected, dues, revenue | Retention | Analytics |
| Consent log — **Built** | Purpose-wise consent, STOP opt-out | Compliance | CRM |

**MVP build estimate:** 2 engineers + 1 designer, 6–8 weeks, reusing core QR, CRM, messaging, payments and staff app (estimate).

### Phase 2: months 3–6 (P1)

| Feature | Metric |
|---|---|
| Pickup and delivery: booking via WhatsApp or QR booking page, time slots, rider app, area-sorted route list, collect amount — **Built in MVP (QR booking, slots, route list, collect amount)** | ARPU (Growth) |
| Monthly plans: kg or piece bundles, prepaid wallet, auto-deduct, renewal reminders — **Built in MVP (bundles + auto-deduct)** | ARPU for owner, retention |
| Dispute module: claim form, evidence view, policy cap, resolution log, export for consumer forum reply | Retention |
| Campaigns: win-back, festival (Diwali, wedding season), refer-a-friend credit — **Win-back and plan offers built in MVP** | Retention, referral |
| Google review request after delivery | Acquisition for owner |
| Shoe and bag care: before/after photo pairs, shareable result card | Referral |
| Regional language UI | Acquisition |

### Phase 3: months 6–12 (P2)

| Feature | Metric |
|---|---|
| Plant mode: multiple counters, store-to-workshop challans, batch scanning, partial delivery | ARPU (Plant) |
| Corporate, hotel, hostel/PG accounts with monthly invoices (link with StayBell / NestKeep) | ARPU |
| Staff productivity and attendance | Retention |
| Customer self-serve status page by QR on receipt — **Built in MVP** | Retention |
| Inventory of consumables (solvent, hangers, covers) | Retention |
| Franchise reports for small 3–10 store brands | ARPU |

## Data model (key entities)

| Entity | Key fields |
|---|---|
| Business / Store | id, name, type (counter/plant), GSTIN, address, hours, plan |
| PriceItem | id, store_id, item name, service (dry clean/wash-fold/wash-iron/press/shoe/bag), unit (piece/kg/pair), price, express price |
| Customer | id, phone, name, address, preferences, wallet_balance, plan_id |
| Consent | customer_id, purpose (updates/marketing), source, timestamp, status |
| Order | id, store_id, customer_id, channel (counter/pickup), due_at, status, total, paid, delivery_mode |
| OrderItem | id, order_id, price_item_id, tag_code, colour/brand note, declared_value, stage, location |
| Photo | id, order_item_id, url, stage (intake/after), taken_by, taken_at |
| StageEvent | order_item_id, stage, scanned_by, scanned_at |
| Pickup | id, customer_id, slot, rider_id, status, route_seq |
| Subscription | id, customer_id, plan (kg/pieces), period, balance, renews_at |
| Dispute | id, order_item_id, type (damage/loss/delay), claim_amount, evidence, outcome, settled_amount |
| Message | id, customer_id, template, category, cost, sent_at |

## Integrations

| Integration | Purpose | Phase |
|---|---|---|
| WhatsApp Business Platform via BSP | Status updates, campaigns | P0 |
| Razorpay / UPI links | Payments and wallet top-ups | P0 |
| Bluetooth thermal label printers (58/80 mm) | QR tags and receipts | P0 |
| Google Maps (geocoding, area sort) | Route list | P1 |
| Google Business Profile review link | Reviews | P1 |
| Tally export | Accounts | P2 |

## Success metrics

| Metric | Definition | 90-day target (estimate) |
|---|---|---|
| North star | Tagged items per store per week | 300+ |
| Activation | 50 orders tagged with WhatsApp updates in the first 14 days | 70% of trials |
| Trial to paid | Trials paying by day 21 | 35%+ |
| Dispute rate | Disputes per 1,000 items | Down 50% vs owner's baseline |
| Owner collections | Share of bills paid via UPI link | 40%+ |
| Logo churn | Paid stores cancelling per month | under 3% |
| Monthly plans (Growth) | Active subscriptions per store | 20+ |
