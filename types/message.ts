export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_type: "member" | "connection";
  body: string | null;
  media_type: "image" | "audio" | null;
  media_path: string | null;
  media_url?: string | null;
  duration_seconds: number | null;
  created_at: string;
  read_at: string | null;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "requested" | "accepted";
};
