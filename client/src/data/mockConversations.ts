export interface ChatMessage {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  online: boolean;
  lastMessage: string;
  time: string;
  unread: number;
  messages: ChatMessage[];
}

// Local UI fixtures only; replace with server-backed data in a later integration task.
export const initialConversations: Conversation[] = [
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    avatarColor: "lavender",
    online: true,
    lastMessage: "That sounds perfect! See you there ✨",
    time: "9:42 AM",
    unread: 2,
    messages: [
      { id: "m1", text: "Hey! Have you tried the new coffee place on Franklin?", time: "9:32 AM", fromMe: false },
      { id: "m2", text: "Not yet, but I keep hearing good things about it.", time: "9:35 AM", fromMe: true },
      { id: "m3", text: "Their little garden patio is so lovely. We should go this week!", time: "9:38 AM", fromMe: false },
      { id: "m4", text: "Thursday afternoon? I could use a good coffee and a catch-up.", time: "9:40 AM", fromMe: true },
      { id: "m5", text: "That sounds perfect! See you there ✨", time: "9:42 AM", fromMe: false },
    ],
  },
  {
    id: "james",
    name: "James Wilson",
    initials: "JW",
    avatarColor: "peach",
    online: true,
    lastMessage: "Sent you the playlist 🎧",
    time: "8:16 AM",
    unread: 0,
    messages: [
      { id: "j1", text: "You mentioned wanting some new music for your commute.", time: "8:12 AM", fromMe: false },
      { id: "j2", text: "Yes! I'm getting a little tired of my usual rotation.", time: "8:14 AM", fromMe: true },
      { id: "j3", text: "Sent you the playlist 🎧", time: "8:16 AM", fromMe: false },
    ],
  },
  {
    id: "olivia",
    name: "Olivia Parker",
    initials: "OP",
    avatarColor: "mint",
    online: false,
    lastMessage: "Thank you for the book recommendation!",
    time: "Yesterday",
    unread: 0,
    messages: [
      { id: "o1", text: "I finally started the book you recommended.", time: "Yesterday", fromMe: false },
      { id: "o2", text: "Oh, I hope you like it! The first few chapters really pulled me in.", time: "Yesterday", fromMe: true },
      { id: "o3", text: "Thank you for the book recommendation!", time: "Yesterday", fromMe: false },
    ],
  },
  {
    id: "noah",
    name: "Noah Bennett",
    initials: "NB",
    avatarColor: "blue",
    online: false,
    lastMessage: "I'll share the photos tonight",
    time: "Mon",
    unread: 0,
    messages: [
      { id: "n1", text: "Those hiking trails looked beautiful this weekend.", time: "Monday", fromMe: true },
      { id: "n2", text: "The views were unreal. I'll share the photos tonight", time: "Monday", fromMe: false },
    ],
  },
  {
    id: "sophia",
    name: "Sophia Martinez",
    initials: "SM",
    avatarColor: "rose",
    online: false,
    lastMessage: "Let's make a plan soon 💛",
    time: "Sun",
    unread: 0,
    messages: [
      { id: "s1", text: "It's been far too long since we had a proper catch-up.", time: "Sunday", fromMe: false },
      { id: "s2", text: "Agreed! Let's make a plan soon 💛", time: "Sunday", fromMe: true },
    ],
  },
];
