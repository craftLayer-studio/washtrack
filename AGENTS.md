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

## Code

WashTrack MVP: Next.js 16.4.6 (App Router, webpack), React 19.3, TypeScript strict, Drizzle ORM on Postgres (PGlite for dev and tests), Astryx design system (theme `butter`). See [README.md](README.md) for how to run and the demo walkthrough.

### Structure

| Path | What lives there |
|---|---|
| `src/domain/` | Pure business rules, no React/Next/IO: money (paise), stages and roll-up, pricing and plan coverage, consent, message templates, payments, route order, plans, dashboard maths, IST time, phone (E.164). Unit tests next to each file. |
| `src/server/db/` | `schema.ts` (every business table has `org_id`), `client.ts` (PGlite file DB, in-memory for tests, `pg` when `DATABASE_URL` is set), `migrations/` (drizzle-kit, committed), `seed.ts` (fictional demo business). |
| `src/server/store/` | Data access and use cases, one file per area (orders, customers, jobs, plans, campaigns, dashboard, public, settings, auth). Every query filters by `orgId`. `store.test.ts` runs against in-memory PGlite. |
| `src/server/store/messaging.ts` | Message adapter interface; the only adapter is `simulated`, which writes to `outbox`. Consent is checked here before any send. |
| `src/server/http.ts`, `auth.ts`, `session.ts`, `ratelimit.ts` | Input parsing, `requireActor(roles)` for route handlers, signed httpOnly session cookie, in-memory rate limiter for public endpoints. |
| `src/app/api/` | Thin route handlers: parse, validate, call the store, return JSON. Public customer endpoints live under `api/public/`. |
| `src/app/app/` | Staff and owner screens (server page loads data, a client view renders Astryx components). |
| `src/app/o/`, `src/app/s/`, `src/app/tag/` | Public pages: order tracking, pickup booking from the shop QR, tag QR redirect. |
| `src/app/print/` | Printable garment tags and shop QR sheet. |

### Commands

`pnpm dev` · `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (must pass before pushing; CI runs the same) · `pnpm exec astryx doctor --built .` · `pnpm db:generate` after schema changes · `pnpm db:seed`.

### Rules

- Money is integer paise; format with `formatINR`. Totals are computed on the server from the price list, never taken from the client.
- Times are UTC `timestamptz`; show them in Asia/Kolkata with `formatIst` / `istDate`.
- Customers are keyed by E.164 phone per org (`normalizeIndianPhone`).
- Consent: two purposes (`service_updates`, `marketing`), never pre-ticked, append-only `consent_records` with notice version and channel. Marketing sends only to opted-in customers; blocked sends are logged, not sent.
- Item stages only move forward (`assertTransition`); only ready items are delivered; order stage is the least advanced item (`rollUpStage`). The "ready" WhatsApp is sent once, when the whole order becomes ready.
- Integrations are adapters with a simulated implementation. No third-party network calls, no keys in git. UPI intent links and `wa.me` links are fine.
- Roles are enforced on the server in every handler (`requireActor`) and page (`pageActor`). Public tokens are random (`newToken`, `newTagCode`), never sequential ids.
- UI: start from an Astryx template, use components and tokens, no raw `div`/`span` layout, no hex/px, no Tailwind. Demo data is labelled Demo.
- Commits: conventional subjects. Never add a `Co-Authored-By` trailer or a "Generated with" line.

<!-- ASTRYX:START -->
Astryx v0.7.17 · 174 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx component <Name>` to read props before using one; `astryx template <Block>` prints a block example to read for a part it lacks. Astryx names differ from other libraries: buttons, badges, tokens and tabs take their text in `label` (Text, Heading and Link take children), booleans start with `is` or `has` (`isOpen`, `isDisabled`), and every input takes `value` and `onChange`.
Changing an existing page? Keep it: skip step 2 and add components inside its sections; read a block example when it helps.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- THEMES: palettes and custom colors go through the theme, never :root overrides; so does a denser or roomier app (`editor set <name> spacing tight`), never gap and padding changes page by page. A change to one kind of part (the sidebar, its selected item, the gaps in a form) is a theme change too, not props on one page: `editor how "<ask>"` names the `set … --on <part>` line. No app yet: `astryx experimental theme preview app <dir>` makes a starter app that shows the theme. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` (takes pictures of real components) and open the PNGs it writes; a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
To remove this block, run `astryx init --remove-agents`, which removes it from the agent files at the project root and in the folder you run it in; from any other file it leaves, delete everything from ASTRYX:START to ASTRYX:END.
<!-- ASTRYX:END -->
