export type LiveSession = {
  session_id: string;
  peer_id: string;
  display_name: string;
  avatar_url: string | null;
};

export type LiveSessionMessage = {
  id: string;
  session_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
