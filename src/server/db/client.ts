import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export type Db = PgliteDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "src/server/db/migrations");

/** In-memory PGlite database with migrations applied (tests). */
export async function createMemoryDb(): Promise<Db> {
  const db = drizzlePglite(new PGlite(), { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db;
}

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const db = drizzle(new Pool({ connectionString: url }), { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    // Both drivers expose the same query builder; the PGlite type is used as the common shape.
    return db as unknown as Db;
  }
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data/pglite");
  mkdirSync(path.dirname(dir), { recursive: true });
  const db = drizzlePglite(new PGlite(dir), { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(db);
  return db;
}

const globalForDb = globalThis as unknown as { __washtrackDb?: Promise<Db> };

/** Shared database for the running app. Opens, migrates and (for an empty dev DB) seeds once. */
export function getDb(): Promise<Db> {
  if (!globalForDb.__washtrackDb) {
    globalForDb.__washtrackDb = open().catch((err) => {
      globalForDb.__washtrackDb = undefined;
      throw err;
    });
  }
  return globalForDb.__washtrackDb;
}
