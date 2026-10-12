"use client";

import type { Message } from "ably";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel";
import ChatPanel from "./components/ChatPanel";
import ConversationList from "./components/ConversationList";
import HomeDashboard from "./components/HomeDashboard";
import Icon from "./components/Icon";
import ProfilePanel from "./components/ProfilePanel";
import { apiRequest } from "./lib/api";
import type { ChatMessage, ChatUser, Conversation } from "./types/chat";

interface ApiConversation {
  id: string;
  participant: { id: string; username: string; displayName: string };
  lastMessage: { id: string; senderId: string; content: string; createdAt: string } | null;
  lastMessageAt: string;
}

interface ApiMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  pinVersion?: number;
}

interface PinSnapshot {
  pinnedAt: string | null;
  pinnedBy: string | null;
  pinVersion: number;
}

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function colorFor(id: string): string {
  const colors = ["lavender", "peach", "mint", "blue", "rose"];
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function toConversation(record: ApiConversation): Conversation {
  return {
    id: record.id,
    participantId: record.participant.id,
    name: record.participant.displayName,
    initials: initials(record.participant.displayName),
    avatarColor: colorFor(record.participant.id),
    lastMessage: record.lastMessage?.content ?? "No messages yet",
    lastMessageId: record.lastMessage?.id ?? null,
    time: timeLabel(record.lastMessage?.createdAt ?? record.lastMessageAt),
  };
}

function toMessage(record: ApiMessage, currentUserId: string): ChatMessage {
  const date = new Date(record.createdAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const day = Number.isNaN(date.getTime()) ? "Conversation"
    : date.toDateString() === today.toDateString() ? "Today"
      : date.toDateString() === yesterday.toDateString() ? "Yesterday"
        : date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  return {
    id: record.id,
    text: record.content,
    time: Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    day,
    createdAt: record.createdAt,
    fromMe: record.senderId === currentUserId,
    pinnedAt: record.pinnedAt ?? null,
    pinnedBy: record.pinnedBy ?? null,
    pinVersion: record.pinVersion ?? 0,
  };
}

export default function HomePage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageLoadAttempt, setMessageLoadAttempt] = useState(0);
  const [messageError, setMessageError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [screen, setScreen] = useState<"home" | "messages" | "profile">("home");
  const [profileReturnScreen, setProfileReturnScreen] = useState<"home" | "messages">("home");
  const [realtimeStatus, setRealtimeStatus] = useState<"off" | "connecting" | "connected" | "unavailable">("off");
  const deletedMessageIds = useRef(new Set<string>());
  const pinVersions = useRef(new Map<string, PinSnapshot>());

  function mergePinSnapshot(message: ChatMessage): ChatMessage {
    const current = pinVersions.current.get(message.id);
    return current && current.pinVersion > message.pinVersion
      ? { ...message, ...current }
      : message;
  }

  function applyPinUpdate(message: ChatMessage) {
    if (deletedMessageIds.current.has(message.id)) return;
    const current = pinVersions.current.get(message.id);
    if (current && current.pinVersion >= message.pinVersion) return;
    const snapshot = { pinnedAt: message.pinnedAt, pinnedBy: message.pinnedBy, pinVersion: message.pinVersion };
    pinVersions.current.set(message.id, snapshot);
    const updated = { ...message, ...snapshot };
    setMessages((items) => items.map((item) => item.id === updated.id ? { ...item, ...snapshot } : item));
    setPinnedMessages((items) => {
      const remaining = items.filter((item) => item.id !== updated.id);
      return updated.pinnedAt
        ? [updated, ...remaining].sort((left, right) => Date.parse(right.pinnedAt ?? "") - Date.parse(left.pinnedAt ?? ""))
        : remaining;
    });
  }

  function removeMessageLocally(messageId: string) {
    deletedMessageIds.current.add(messageId);
    setMessages((items) => items.filter((item) => item.id !== messageId));
    setPinnedMessages((items) => items.filter((item) => item.id !== messageId));
    if (accessToken) void loadConversations(accessToken);
  }

  const loadConversations = useCallback(async (token: string) => {
    setConversationsLoading(true);
    setConversationsError("");
    try {
      const response = await apiRequest<{ conversations: ApiConversation[] }>("/api/conversations", {}, token);
      const nextConversations = response.conversations.map(toConversation);
      setConversations(nextConversations);
      setActiveId((current) =>
        current && nextConversations.some((conversation) => conversation.id === current)
          ? current
          : nextConversations[0]?.id ?? null,
      );
      return nextConversations;
    } catch (error) {
      setConversationsError(error instanceof Error ? error.message : "Could not load conversations.");
      return null;
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) void loadConversations(accessToken);
  }, [accessToken, loadConversations]);

  useEffect(() => {
    if (screen !== "messages") {
      setMessagesLoading(false);
      return;
    }
    if (!accessToken || !currentUser || !activeId) {
      setMessages([]);
      setMessagesLoading(false);
      setMessageError("");
      return;
    }

    let cancelled = false;
    setMessagesLoading(true);
    setMessageError("");
    setSendError("");
    apiRequest<{ messages: ApiMessage[]; pinnedMessages: ApiMessage[] }>(`/api/conversations/${activeId}/messages`, {}, accessToken)
      .then((response) => {
        if (!cancelled) {
          const history = response.messages
            .map((message) => mergePinSnapshot(toMessage(message, currentUser.id)))
            .filter((message) => !deletedMessageIds.current.has(message.id));
          const pins = response.pinnedMessages
            .map((message) => mergePinSnapshot(toMessage(message, currentUser.id)))
            .filter((message) => message.pinnedAt && !deletedMessageIds.current.has(message.id));
          setPinnedMessages(pins);
          setMessages((current) => {
            const merged = new Map(history.map((message) => [message.id, message]));
            for (const item of current) {
              if (!deletedMessageIds.current.has(item.id)) merged.set(item.id, mergePinSnapshot(item));
            }
            return [...merged.values()].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessageError(error instanceof Error ? error.message : "Could not load messages.");
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken, activeId, currentUser, messageLoadAttempt, screen]);

  useEffect(() => {
    if (screen !== "messages" || !accessToken || !currentUser || !activeId) {
      setRealtimeStatus("off");
      return;
    }

    let cancelled = false;
    let cleanupRealtime: (() => void) | null = null;
    setRealtimeStatus("connecting");
    void import("ably/modular").then(({ BaseRealtime, FetchRequest, WebSocketTransport }) => {
      if (cancelled) return;

      const realtime = new BaseRealtime({
        plugins: { FetchRequest, WebSocketTransport },
        authCallback: async (_tokenParams, callback) => {
          try {
            const response = await fetch("/api/realtime/ably-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ conversationId: activeId }),
            });
            const result = await response.json();
            if (!response.ok) {
              throw new Error(result?.error?.message || "Could not authorize real-time messaging.");
            }
            callback(null, result);
          } catch (error) {
            callback(error instanceof Error ? error.message : "Could not authorize real-time messaging.", null);
          }
        },
      });
      const channel = realtime.channels.get(`private-conversation:${activeId}`);
      const handleMessage = (event: Message) => {
        const record = event.data as Partial<ApiMessage> | null;
        if (
          !record ||
          typeof record.id !== "string" ||
          typeof record.senderId !== "string" ||
          typeof record.content !== "string" ||
          typeof record.createdAt !== "string"
        ) return;

        const incoming = toMessage(record as ApiMessage, currentUser.id);
        setMessages((current) => current.some((message) => message.id === incoming.id)
          ? current
          : [...current, incoming]);
        setConversations((current) => current.map((conversation) => conversation.id === activeId
          ? { ...conversation, lastMessage: record.content!, lastMessageId: record.id!, time: timeLabel(record.createdAt!) }
          : conversation));
      };

      const handleMessageDeleted = (event: Message) => {
        const record = event.data as { id?: unknown } | null;
        if (record && typeof record.id === "string") removeMessageLocally(record.id);
      };

      const handleMessagePinUpdated = (event: Message) => {
        const record = event.data as Partial<ApiMessage> | null;
        if (!record || typeof record.id !== "string" || typeof record.senderId !== "string" ||
          typeof record.content !== "string" || typeof record.createdAt !== "string" ||
          !(record.pinnedAt === null || typeof record.pinnedAt === "string") ||
          !(record.pinnedBy === null || typeof record.pinnedBy === "string") ||
          typeof record.pinVersion !== "number") return;
        applyPinUpdate(toMessage(record as ApiMessage, currentUser.id));
      };

      cleanupRealtime = () => {
        channel.unsubscribe("new-message", handleMessage);
        channel.unsubscribe("message-deleted", handleMessageDeleted);
        channel.unsubscribe("message-pin-updated", handleMessagePinUpdated);
        realtime.close();
      };
      void Promise.all([
        channel.subscribe("new-message", handleMessage),
        channel.subscribe("message-deleted", handleMessageDeleted),
        channel.subscribe("message-pin-updated", handleMessagePinUpdated),
      ])
        .then(() => { if (!cancelled) setRealtimeStatus("connected"); })
        .catch(() => { if (!cancelled) setRealtimeStatus("unavailable"); });
    }).catch(() => {
      if (!cancelled) setRealtimeStatus("unavailable");
    });

    return () => {
      cancelled = true;
      cleanupRealtime?.();
    };
  }, [accessToken, activeId, currentUser, screen]);

  const activeConversation = conversations.find(({ id }) => id === activeId);
  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conversations;
    return conversations.filter(({ name, lastMessage }) =>
      `${name} ${lastMessage}`.toLowerCase().includes(normalizedQuery),
    );
  }, [conversations, query]);

  function handleAuthenticated(token: string, user: ChatUser) {
    setCurrentUser(user);
    setAccessToken(token);
    setSessionError("");
    setScreen("home");
  }

  async function handleLogout() {
    try {
      await apiRequest<void>("/api/auth/logout", { method: "POST" });
      setAccessToken(null);
      setCurrentUser(null);
      setConversations([]);
      setActiveId(null);
      setMessages([]);
      setPinnedMessages([]);
      deletedMessageIds.current.clear();
      pinVersions.current.clear();
      setScreen("home");
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Could not log out.");
    }
  }

  async function startConversation(participantId: string) {
    if (!accessToken) return;
    const result = await apiRequest<{ conversation: { id: string } }>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ participantId }),
    }, accessToken);
    const updated = await loadConversations(accessToken);
    if (updated) {
      setMessages([]);
      setPinnedMessages([]);
      setActiveId(result.conversation.id);
      setMobileChatOpen(true);
      setScreen("messages");
    }
  }

  async function sendMessage(text: string): Promise<boolean> {
    if (!accessToken || !activeId || !currentUser) return false;
    setSendError("");
    try {
      const response = await apiRequest<{ message: ApiMessage; realtimePublished?: boolean }>(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      }, accessToken);
      const message = toMessage(response.message, currentUser.id);
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setSendError(response.realtimePublished === false
        ? "Message saved, but live delivery failed. The other person may need to reload."
        : "");
      setConversations((current) => current.map((conversation) => conversation.id === activeId
        ? { ...conversation, lastMessage: response.message.content, lastMessageId: response.message.id, time: timeLabel(response.message.createdAt) }
        : conversation));
      return true;
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not send the message.");
      return false;
    }
  }

  function selectConversation(id: string) {
    setMessages([]);
    setPinnedMessages([]);
    setActiveId(id);
    setMobileChatOpen(true);
    setScreen("messages");
  }

  async function deleteMessageById(messageId: string) {
    if (!accessToken || !activeId) throw new Error("Select a conversation before deleting a message.");
    const result = await apiRequest<{ deleted: { id: string }; realtimePublished: boolean }>(
      `/api/conversations/${activeId}/messages/${messageId}`,
      { method: "DELETE" },
      accessToken,
    );
    removeMessageLocally(result.deleted.id);
    setSendError(result.realtimePublished ? "" : "Message deleted, but live sync failed. Other participants may need to reload.");
  }

  async function toggleMessagePin(message: ChatMessage) {
    if (!accessToken || !activeId || !currentUser) throw new Error("Select a conversation before changing pinned messages.");
    const result = await apiRequest<{ message: ApiMessage; realtimePublished: boolean }>(
      `/api/conversations/${activeId}/messages/${message.id}`,
      { method: "PATCH", body: JSON.stringify({ pinned: !message.pinnedAt }) },
      accessToken,
    );
    applyPinUpdate(toMessage(result.message, currentUser.id));
    setSendError(result.realtimePublished ? "" : "Pin saved, but live sync failed. Other participants may need to reload.");
  }

  function loadPinnedMessage(message: ChatMessage) {
    if (deletedMessageIds.current.has(message.id)) return;
    setMessages((current) => current.some((item) => item.id === message.id)
      ? current
      : [...current, mergePinSnapshot(message)].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)));
  }

  function openProfile() {
    setProfileReturnScreen(screen === "messages" ? "messages" : "home");
    setScreen("profile");
  }

  if (!accessToken || !currentUser) return <AuthPanel onAuthenticated={handleAuthenticated} />;

  if (screen === "profile") {
    return (
      <ProfilePanel
        accessToken={accessToken}
        onBack={() => setScreen(profileReturnScreen)}
        onLogout={handleLogout}
        onProfileUpdated={(user) => setCurrentUser((current) => current ? { ...current, ...user } : current)}
      />
    );
  }

  if (screen === "home") {
    return (
      <HomeDashboard
        user={currentUser}
        conversations={conversations}
        loading={conversationsLoading}
        error={conversationsError}
        theme={theme}
        onOpenMessages={() => { setMobileChatOpen(Boolean(activeId)); setScreen("messages"); }}
        onOpenConversation={selectConversation}
        onOpenProfile={openProfile}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <main className={`chat-shell${mobileChatOpen ? " mobile-chat-open" : ""}`} data-theme={theme}>
      <ConversationList
        conversations={filteredConversations}
        activeId={activeId}
        query={query}
        theme={theme}
        currentUser={currentUser}
        loading={conversationsLoading}
        error={conversationsError}
        onQueryChange={setQuery}
        onSelect={selectConversation}
        onOpenHome={() => setScreen("home")}
        onToggleTheme={() => setTheme((current) => current === "light" ? "dark" : "light")}
        onStartConversation={startConversation}
        onOpenProfile={openProfile}
        onLogout={handleLogout}
      />
      {sessionError && <div className="session-error" role="alert">{sessionError}</div>}
      {activeConversation ? (
        <ChatPanel
          conversation={activeConversation}
          messages={messages}
          messagesLoading={messagesLoading}
          messageError={messageError}
          sendError={sendError}
          realtimeStatus={realtimeStatus}
          onSend={sendMessage}
          pinnedMessages={pinnedMessages}
          onDeleteMessage={deleteMessageById}
          onTogglePin={toggleMessagePin}
          onLoadPinnedMessage={loadPinnedMessage}
          onRetry={() => setMessageLoadAttempt((current) => current + 1)}
          onBack={() => setMobileChatOpen(false)}
          onOpenHome={() => setScreen("home")}
        />
      ) : (
        <section className="empty-chat" aria-live="polite">
          <span className="empty-chat-icon" aria-hidden="true"><Icon name="sparkles" size={25} /></span>
          <h1>{conversationsLoading ? "Loading your conversations" : conversationsError ? "Couldn't load conversations" : "Your messages live here"}</h1>
          <p>{conversationsError || "Select a conversation from the sidebar, or start a private chat there to begin messaging."}</p>
        </section>
      )}
    </main>
  );
}
