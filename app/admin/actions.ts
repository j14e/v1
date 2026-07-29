"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminClient,
  getAdminSettings,
  getEligibleAdminOwnerId,
  hasValidAdminSession,
  hashAdminPassword,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = {
  error: string;
  success: string;
};

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  const settings = await getAdminSettings();
  if (
    !user ||
    !settings ||
    !(await hasValidAdminSession(user.id, settings))
  ) {
    return null;
  }
  return { user, settings };
}

function readPassword(formData: FormData) {
  return String(formData.get("password") ?? "");
}

export async function setupAdminAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first.", success: "" };

  const [settings, eligibleOwnerId] = await Promise.all([
    getAdminSettings(),
    getEligibleAdminOwnerId(),
  ]);
  if (settings) return { error: "Admin access is already configured.", success: "" };
  if (user.id !== eligibleOwnerId) {
    return { error: "Only the original account can configure admin access.", success: "" };
  }

  const password = readPassword(formData);
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 10) {
    return { error: "Use at least 10 characters.", success: "" };
  }
  if (password !== confirmation) {
    return { error: "The passwords do not match.", success: "" };
  }

  const { hash, salt } = await hashAdminPassword(password);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_settings")
    .insert({
      id: 1,
      owner_id: user.id,
      password_hash: hash,
      password_salt: salt,
    })
    .select(
      "id,owner_id,password_hash,password_salt,created_at,updated_at",
    )
    .single();

  if (error) return { error: error.message, success: "" };
  await setAdminSession(data);
  redirect("/admin");
}

export async function unlockAdminAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await getCurrentUser();
  const settings = await getAdminSettings();
  if (!user || !settings || settings.owner_id !== user.id) {
    return { error: "Admin access is not available for this account.", success: "" };
  }

  const valid = await verifyAdminPassword(readPassword(formData), settings);
  if (!valid) return { error: "Incorrect admin password.", success: "" };

  await setAdminSession(settings);
  redirect("/admin");
}

export async function lockAdminAction() {
  await clearAdminSession();
  redirect("/admin");
}

export async function manageMemberAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return { error: "Your admin session expired. Unlock the portal again.", success: "" };
  }

  const memberId = String(formData.get("member_id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!memberId || !["freeze", "unfreeze", "remove"].includes(intent)) {
    return { error: "Invalid account action.", success: "" };
  }
  if (memberId === adminSession.user.id) {
    return { error: "The owner account cannot be frozen or removed.", success: "" };
  }

  const admin = createAdminClient();
  const { data: member, error: memberError } = await admin
    .from("profiles")
    .select("id,display_name,frozen")
    .eq("id", memberId)
    .maybeSingle();
  if (memberError || !member) {
    return { error: memberError?.message ?? "Account not found.", success: "" };
  }

  if (intent === "remove") {
    const { error } = await admin.auth.admin.deleteUser(memberId);
    if (error) return { error: error.message, success: "" };
    revalidatePath("/admin");
    revalidatePath("/");
    return { error: "", success: `${member.display_name} was removed.` };
  }

  const freeze = intent === "freeze";
  const { error: authError } = await admin.auth.admin.updateUserById(memberId, {
    ban_duration: freeze ? "876000h" : "none",
  });
  if (authError) return { error: authError.message, success: "" };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ frozen: freeze })
    .eq("id", memberId);
  if (profileError) {
    await admin.auth.admin.updateUserById(memberId, {
      ban_duration: freeze ? "none" : "876000h",
    });
    return { error: profileError.message, success: "" };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return {
    error: "",
    success: freeze
      ? `${member.display_name} was frozen.`
      : `${member.display_name} was unfrozen.`,
  };
}
