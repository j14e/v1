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
  .select(
    "id,display_name,availability_status,year_level,programme,major,department,courses,avatar_url,is_demo",
  )
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

const { error: privateMessageError } = await supabase
  .from("messages")
  .select("id,message_type")
  .limit(1);

if (!privateMessageError) {
  throw new Error("Anonymous access can read private messages.");
}

const { error: privateConnectionHistoryError } = await supabase
  .from("oracle_connections")
  .select("id")
  .limit(1);

if (!privateConnectionHistoryError) {
  throw new Error("Anonymous access can read private connection history.");
}

const { error: removedConnectionRunError } =
  await supabase.rpc("run_connection_oracle");

if (!removedConnectionRunError) {
  throw new Error("Removed connection matching function is still callable.");
}

const { error: bannerReadError } = await supabase
  .from("banner_submissions")
  .select("id,file_path")
  .limit(1);

if (bannerReadError) {
  throw new Error(`Public banner display is unavailable: ${bannerReadError.message}`);
}

const { error: anonymousBannerInsertError } = await supabase
  .from("banner_submissions")
  .insert({
    member_id: "00000000-0000-0000-0000-000000000000",
    file_path: "anonymous/test.png",
    file_name: "test.png",
    mime_type: "image/png",
  });

if (!anonymousBannerInsertError) {
  throw new Error("Anonymous users can submit banner files.");
}

const { error: adminSettingsError } = await supabase
  .from("admin_settings")
  .select("password_hash")
  .limit(1);

if (!adminSettingsError) {
  throw new Error("Anonymous access can read admin settings.");
}

console.log("Backend checks passed.");
