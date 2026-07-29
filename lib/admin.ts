import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCallback);
const ADMIN_COOKIE = "v1-admin-session";
const SESSION_SECONDS = 60 * 60 * 8;

export type AdminSettings = {
  id: number;
  owner_id: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
};

export function createAdminClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function getAdminSettings() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_settings")
    .select(
      "id,owner_id,password_hash,password_salt,created_at,updated_at",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  return data as AdminSettings | null;
}

export async function getEligibleAdminOwnerId() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("verified", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return { hash: derived.toString("hex"), salt };
}

export async function verifyAdminPassword(
  password: string,
  settings: AdminSettings,
) {
  const expected = Buffer.from(settings.password_hash, "hex");
  const actual = (await scrypt(
    password,
    settings.password_salt,
    expected.length,
  )) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signAdminSession(
  ownerId: string,
  expiresAt: number,
  passwordHash: string,
) {
  const payload = `${ownerId}.${expiresAt}`;
  const signature = createHmac("sha256", passwordHash)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export async function setAdminSession(settings: AdminSettings) {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_COOKIE,
    signAdminSession(
      settings.owner_id,
      expiresAt,
      settings.password_hash,
    ),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/admin",
      maxAge: SESSION_SECONDS,
    },
  );
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export async function hasValidAdminSession(
  userId: string,
  settings: AdminSettings,
) {
  if (settings.owner_id !== userId) return false;

  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!value) return false;

  const [ownerId, expiresText, suppliedSignature, ...extra] =
    value.split(".");
  const expiresAt = Number(expiresText);
  if (
    extra.length ||
    ownerId !== userId ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    return false;
  }

  const expectedValue = signAdminSession(
    ownerId,
    expiresAt,
    settings.password_hash,
  );
  const expectedSignature = expectedValue.split(".")[2];
  const expected = Buffer.from(expectedSignature, "hex");
  const supplied = Buffer.from(suppliedSignature || "", "hex");

  return (
    expected.length === supplied.length && timingSafeEqual(expected, supplied)
  );
}
