"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OracleMatch, OracleState } from "@/types/oracle";

export async function runConnectionOracle(
  _previousState: OracleState,
  _formData: FormData,
): Promise<OracleState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      matches: [],
      message: "",
      error: "Sign in to use Connection Oracle.",
      hasRun: true,
    };
  }

  const { data, error } = await supabase.rpc("run_connection_oracle");

  if (error) {
    return {
      matches: [],
      message: "",
      error:
        error.message === "A verified, active profile is required."
          ? error.message
          : "Connection Oracle could not complete the match. Please try again.",
      hasRun: true,
    };
  }

  const matches = (data ?? []) as OracleMatch[];
  revalidatePath("/oracle");
  revalidatePath("/messages");

  return {
    matches,
    message: matches.length
      ? `${matches.length} new ${
          matches.length === 1 ? "connection" : "connections"
        } found. A system notice was added to Messages.`
      : "No new members are available to match right now. Check again as the directory grows.",
    error: "",
    hasRun: true,
  };
}
