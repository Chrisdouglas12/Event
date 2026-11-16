import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let _db: Database | null = null;

function getDb(): Database {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Configure the Supabase PostgreSQL pooler URL.");
  }
  const client = postgres(connectionString, {
    prepare: false,
    max: Number(process.env.DB_POOL_SIZE || 5),
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
  });
  _db = drizzle(client, { schema });
  return _db;
}

// Lazy proxy: defers env validation/connection until first query,
// so `next build` page-data collection doesn't crash on missing env.
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const value = (getDb() as any)[prop];
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

