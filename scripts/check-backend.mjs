import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env.local");
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

const { error: directoryError } = await supabase
  .from("directory_profiles")
  .select("id,display_name,year_level,programme,major,department,courses,avatar_url")
  .limit(1);

if (directoryError) {
  throw new Error(`Public directory is unavailable: ${directoryError.message}`);
}

const { error: privateEmailError } = await supabase
  .from("profiles")
  .select("email")
  .limit(1);

if (!privateEmailError) {
  throw new Error("Anonymous access can read private profile email data.");
}

console.log("Backend checks passed.");
