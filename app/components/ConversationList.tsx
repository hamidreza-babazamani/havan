import { useState, type FormEvent } from "react";
import type { ChatUser, Conversation } from "../types/chat";
import Icon from "./Icon";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  query: string;
  theme: "light" | "dark";
  currentUser: ChatUser;
  loading: boolean;
  error: string;
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
  onOpenHome: () => void;
  onToggleTheme: () => void;
  onStartConversation: (participantId: string) => Promise<void>;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export default function ConversationList({ conversations, activeId, query, theme, currentUser, loading, error, onQueryChange, onSelect, onOpenHome, onToggleTheme, onStartConversation, onOpenProfile, onLogout }: ConversationListProps) {
  const [participantId, setParticipantId] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  async function handleStartConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStartError("");
    setStarting(true);
    try {
      await onStartConversation(participantId.trim());
      setParticipantId("");
    } catch (requestError) {
      setStartError(requestError instanceof Error ? requestError.message : "Could not start conversation.");
    } finally {
      setStarting(false);
    }
  }

  const initials = currentUser.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="conversation-sidebar" aria-label="Conversations">
      <header className="sidebar-header">
        <button className="brand brand-button" type="button" onClick={onOpenHome} aria-label="Go to Haven home">
          <span className="brand-mark" aria-hidden="true"><Icon name="message" size={17} strokeWidth={2.1} /></span>
          <span>haven<span className="brand-period">.</span></span>
        </button>
        <button className="icon-button theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
          <Icon name={theme === "light" ? "moon" : "sun"} size={17} />
        </button>
      </header>

      <nav className="workspace-nav" aria-label="Main navigation">
        <button className="workspace-nav-link" type="button" onClick={onOpenHome}><Icon name="home" size={17} />Home</button>
        <span className="workspace-nav-link is-current" aria-current="page"><Icon name="message" size={17} />Messages</span>
        <button className="workspace-nav-link" type="button" onClick={onOpenProfile}><Icon name="settings" size={17} />Profile &amp; settings</button>
      </nav>

      <div className="inbox-heading">
        <div><p className="eyebrow">YOUR SPACE</p><h1>Messages <span className="total-count">{conversations.length}</span></h1></div>
        <span className="inbox-sparkle" aria-hidden="true"><Icon name="plus" size={18} /></span>
      </div>

      <label className="search-box">
        <span className="search-icon" aria-hidden="true"><Icon name="search" size={17} /></span>
        <span className="sr-only">Search conversations</span>
        <input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search conversations" />
      </label>

      <details className="new-chat-details">
        <summary><Icon name="plus" size={16} /><span>Start a private chat</span></summary>
        <form className="new-chat-form" onSubmit={handleStartConversation}>
          <label className="sr-only" htmlFor="participant-id">Username or participant ID</label>
          <input id="participant-id" value={participantId} onChange={(event) => setParticipantId(event.target.value)} placeholder="Username (@test1) or participant ID" required />
          <button type="submit" disabled={starting}>{starting ? "Starting…" : "Start"}</button>
          {startError && <p role="alert">{startError}</p>}
        </form>
      </details>

      <div className="list-label"><span>ALL CHATS</span><span className="list-dot" aria-hidden="true" /></div>

      <nav className="conversation-list" aria-label="Chat list">
        {conversations.map((conversation) => (
          <button className={`conversation-item${conversation.id === activeId ? " is-active" : ""}`} type="button" key={conversation.id} onClick={() => onSelect(conversation.id)} aria-current={conversation.id === activeId ? "page" : undefined}>
            <span className={`avatar avatar-${conversation.avatarColor}`}>{conversation.initials}</span>
            <span className="conversation-copy">
              <span className="conversation-topline"><span className="conversation-name">{conversation.name}</span><span className="conversation-time">{conversation.time}</span></span>
              <span className="conversation-bottomline"><span className="conversation-preview">{conversation.lastMessage}</span></span>
            </span>
          </button>
        ))}
        {loading && <p className="no-results" role="status">Loading your conversations…</p>}
        {error && <p className="no-results list-error" role="alert">{error}</p>}
        {!loading && !error && conversations.length === 0 && <p className="no-results">{query ? `No chats match “${query}”` : "No conversations yet. Start one above with a username (@test1) or participant ID."}</p>}
      </nav>

      <footer className="profile-card">
        <span className="avatar avatar-profile">{initials}</span>
        <span className="profile-copy"><strong>{currentUser.displayName}</strong><small>@{currentUser.username}</small><small className="profile-id" title={currentUser.id}>ID: {currentUser.id}</small></span>
        <button className="profile-open" type="button" onClick={onOpenProfile} aria-label="Open profile and account settings" title="Profile and settings"><Icon name="settings" size={17} /></button>
        <button className="profile-logout" type="button" onClick={onLogout} aria-label="Log out" title="Log out"><Icon name="logout" size={16} /></button>
      </footer>
    </aside>
  );
}
