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

Shared platform modules are described in [core/README.md](../core/README.md).
