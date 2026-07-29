export type AvailabilityStatus = "open_to_talk" | "busy";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  availability_status: AvailabilityStatus;
  year_level: string;
  programme: string | null;
  major: string | null;
  department: string | null;
  courses: string[];
  avatar_url: string | null;
  verified: boolean;
  created_at: string;
};

export type SessionUser = {
  id: string;
  email: string;
} | null;
