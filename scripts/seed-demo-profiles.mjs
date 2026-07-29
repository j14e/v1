import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase URL or service role key.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const templates = [
  {
    programme: "Bachelor of Arts",
    major: "Politics and International Relations",
    department: "Arts and Education",
    courses: ["POLITICS 106", "EUROPEAN 100"],
  },
  {
    programme: "Bachelor of Commerce",
    major: "Accounting",
    department: "Business School",
    courses: ["ACCTG 102", "BUS 111"],
  },
  {
    programme: "Bachelor of Engineering (Honours)",
    major: "Civil Engineering",
    department: "Engineering and Design",
    courses: ["ENGGEN 121", "ENGSCI 111"],
  },
  {
    programme: "Bachelor of Laws",
    major: "Law",
    department: "Auckland Law School",
    courses: ["LAW 121G", "LAW 131"],
  },
  {
    programme: "Bachelor of Health Sciences",
    major: "Pharmacology",
    department: "Medical and Health Sciences",
    courses: ["POPLHLTH 111", "CHEM 110"],
  },
  {
    programme: "Bachelor of Science",
    major: "Computer Science",
    department: "Science",
    courses: ["COMPSCI 101", "MATHS 108"],
  },
  {
    programme: "Bachelor of Biomedical Science",
    major: "Biomedical Science",
    department: "Auckland Bioengineering Institute",
    courses: ["BIOSCI 107", "MEDSCI 142"],
  },
  {
    programme: "Bachelor of Medical Imaging (Honours)",
    major: "Medicine",
    department: "Liggins Institute",
    courses: ["MEDIMAGE 201", "MEDSCI 205"],
  },
  {
    programme: "Bachelor of Arts",
    major: "Education",
    department: "Te Wānanga o Waipapa",
    courses: ["EDUC 121G", "MAORI 130"],
  },
  {
    programme: "Bachelor of Design",
    major: "Communication",
    department: "Engineering and Design",
    courses: ["DESIGN 100", "DESIGN 101"],
  },
];
const years = [
  "First year",
  "Second year",
  "Third year",
  "Fourth year",
  "Fifth year or above",
];

const existingUsers = new Map();
let page = 1;
const perPage = 1000;
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage,
  });
  if (error) throw error;
  for (const user of data.users) {
    if (user.email) existingUsers.set(user.email.toLowerCase(), user);
  }
  if (data.users.length < perPage) break;
  page += 1;
}

let created = 0;
let updated = 0;

for (let index = 1; index <= 50; index += 1) {
  const number = String(index).padStart(2, "0");
  const email = `v1-demo-${number}@aucklanduni.ac.nz`;
  const template = templates[(index - 1) % templates.length];
  const profile = {
    display_name: `Demo Student ${number}`,
    year_level: years[(index - 1) % years.length],
    programme: template.programme,
    major: template.major,
    department: template.department,
    courses: template.courses,
  };
  let authUser = existingUsers.get(email);

  if (!authUser) {
    const password = `${crypto.randomBytes(28).toString("base64url")}!A9`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: profile,
    });
    if (error) throw new Error(`Could not create ${email}: ${error.message}`);
    authUser = data.user;
    created += 1;
  } else {
    updated += 1;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: authUser.id,
    email,
    ...profile,
    avatar_url: null,
    availability_status: "open_to_talk",
    verified: true,
    frozen: false,
    is_demo: true,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    throw new Error(`Could not seed ${email}: ${profileError.message}`);
  }
}

console.log(`Demo profiles ready: ${created} created, ${updated} refreshed.`);

const { count: demoCount, error: demoCountError } = await supabase
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .eq("is_demo", true);

if (demoCountError) {
  throw new Error(`Could not verify demo profile count: ${demoCountError.message}`);
}

if (demoCount !== 50) {
  throw new Error(`Expected 50 demo profiles, but found ${demoCount ?? 0}.`);
}

console.log(`Verified ${demoCount} demo profiles in the directory.`);
