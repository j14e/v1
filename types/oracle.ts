import type { AvailabilityStatus } from "@/types/profile";

export type OracleMatch = {
  matched_id: string;
  display_name: string;
  availability_status: AvailabilityStatus;
  year_level: string;
  programme: string | null;
  major: string | null;
  department: string | null;
  courses: string[];
  avatar_url: string | null;
  match_reasons: string[];
  connected_at: string;
};

export type OracleState = {
  matches: OracleMatch[];
  message: string;
  error: string;
  hasRun: boolean;
};
