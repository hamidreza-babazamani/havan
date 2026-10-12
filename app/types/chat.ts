export interface ChatUser {
  id: string;
  username: string;
  displayName: string;
  emailVerified?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  time: string;
  day: string;
  createdAt: string;
  fromMe: boolean;
  pinnedAt: string | null;
  pinnedBy: string | null;
  pinVersion: number;
}

export interface Conversation {
  id: string;
  participantId: string;
  name: string;
  initials: string;
  avatarColor: string;
  lastMessage: string;
  lastMessageId?: string | null;
  time: string;
}
