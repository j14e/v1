import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadLocalEnv();

const databaseUrl =
  process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("Missing POSTGRES_URL_NON_POOLING or POSTGRES_URL.");
}

const sql = postgres(databaseUrl, { max: 1, ssl: "require" });
const migrationsDirectory = path.join(
  process.cwd(),
  "supabase",
  "migrations",
);
const migrationPaths = fs
  .readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => path.join(migrationsDirectory, file));

try {
  for (const migrationPath of migrationPaths) {
    await sql.unsafe(fs.readFileSync(migrationPath, "utf8"));
  }
  console.log("Database migration completed.");
} finally {
  await sql.end();
}
