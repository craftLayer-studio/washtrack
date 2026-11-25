# WashTrack: brief for AI agents

## Context

WashTrack is CraftLayer's vertical SaaS for laundries, dry cleaners, laundromats, press shops and shoe/bag care studios in India. It is built on the shared CraftLayer core (see [core/README.md](https://github.com/craftLayer-studio/craftlayer-core/blob/main/README.md)). The wedge is a QR tag on every item at intake, with photos, plus automatic WhatsApp status updates. Pickup and delivery routing, monthly plans, dispute handling and CRM follow.

Goal: fast revenue from owners who already feel the pain of lost garments, "is it ready?" calls and damage disputes. Every feature names the metric it moves.

## Reading order

1. [README.md](README.md)
2. [docs/01-product-plan.md](docs/01-product-plan.md)
3. [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md)
4. [docs/06-go-to-market-and-onboarding.md](docs/06-go-to-market-and-onboarding.md)
5. [docs/04-market-research.md](docs/04-market-research.md)
6. [docs/02-problems-and-benefits.md](docs/02-problems-and-benefits.md), [docs/03-pros-cons-risks.md](docs/03-pros-cons-risks.md)

## Glossary

| Term | Meaning |
|---|---|
| Intake | Moment the garment is received and logged, at counter or at pickup |
| Tag | Washable QR label or pin tag attached to one item; links to the order line |
| Challan | Paper receipt / delivery note given to customer; also store-to-workshop transfer note |
| Plant / workshop | Central processing unit serving one or more collection counters |
| Wash & fold / wash & iron | Per-kg services; dry clean and steam press are usually per piece |
| Monthly plan | Prepaid subscription (for example 30 kg wash & fold or 60 pieces press per month) |
| Rider | Pickup/delivery staff, often on a two-wheeler |
| Utility message | WhatsApp template category for transactional updates; charged per message in India |
| DPDP | Digital Personal Data Protection Act 2023 and Rules 2025 |

## Decisions made

| Decision | Reason |
|---|---|
| Tag every item, not every order | Mix-ups and losses happen at item level |
| Mandatory photo for items flagged "premium" or with visible defects; optional for others | Balance counter speed against dispute evidence |
| Two default WhatsApp templates per order (received with bill, ready/out for delivery); others optional | Keeps message cost under ~₹0.30 per order at ~₹0.145 per utility message |
| Phone-first app; Bluetooth thermal label printer optional, pre-printed tag rolls supported | Most counters have a phone, not a PC |
| Per-store pricing with order caps, like QDC and Fabklean | Familiar to the market; caps drive upgrades |
| Do not target Tumbledry/UClean franchisees in year 1 | They run franchisor-mandated software (QDC lists Tumble Dry among its brands) |

## Open questions

1. **Name check.** No product or major brand called "WashTrack" or "Wash Track" was found in Indian laundry software listings or app stores (searches 2026-11-24). Similar names exist (WashLynx, WASH-Connect, Wash It) but are distinct. No conflict found; still run an Indian trademark search (classes 9, 37, 42). Backup names if needed: **TagNWash** and **PressPal**.
2. Best tag hardware: printed washable synthetic labels via Bluetooth printer vs pre-printed reusable pin tags. Test durability through dry-clean solvent and ironing.
3. Liability policy template: what cap (for example 10x service charge, or declared value) do owners accept, and how should it be shown so it is fair under consumer law?
4. Should Growth include a customer-facing booking page for pickups (via QR on flyers/society notice boards), or keep pickups WhatsApp-only in MVP?
5. Corporate and hostel accounts: share CRM with NestKeep (PG/hostel product) for bundled laundry?
6. "Laundry Pulse", named in the brief as a competitor, was not found as a product in searches; confirm the intended product.

## Rules for agents editing these docs

- Follow [CONVENTIONS.md](https://github.com/craftLayer-studio/craftlayer-products/blob/main/CONVENTIONS.md): sources with access dates or **(estimate)** labels.
- Reference core modules; do not re-specify them.
- Keep prices consistent across README, 05 and 06.
