import type { Message } from "@/types/message";
import type { Profile } from "@/types/profile";

export type InboxItem = {
  person: Profile;
  latest: Message;
  unread: number;
};
