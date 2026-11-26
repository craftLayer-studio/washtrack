import { getDb } from "./client";
import { seedIfEmpty } from "./seed";

/** `pnpm db:seed`: open the dev database (migrating it) and seed the demo business if it is empty. */
async function main() {
  const db = await getDb();
  const seeded = await seedIfEmpty(db);
  console.log(seeded ? "Demo data seeded." : "Database already has data; nothing to do. Delete .data/pglite to reseed.");
  process.exit(0);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
