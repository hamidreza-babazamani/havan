import type { Conversation } from "../data/mockConversations";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string;
  query: string;
  theme: "light" | "dark";
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
  onToggleTheme: () => void;
}

export default function ConversationList({
  conversations,
  activeId,
  query,
  theme,
  onQueryChange,
  onSelect,
  onToggleTheme,
}: ConversationListProps) {
  return (
    <aside className="conversation-sidebar" aria-label="Conversations">
      <header className="sidebar-header">
        <a className="brand" href="#conversations" aria-label="Haven home">
          <span className="brand-mark" aria-hidden="true">h</span>
          <span>haven<span className="brand-period">.</span></span>
        </a>
        <button
          className="icon-button theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        >
          {theme === "light" ? "☾" : "☀"}
        </button>
      </header>

      <div className="inbox-heading">
        <div>
          <p className="eyebrow">YOUR SPACE</p>
          <h1>Messages <span className="total-count">{conversations.length}</span></h1>
        </div>
        <span className="inbox-sparkle" aria-hidden="true">✳</span>
      </div>

      <label className="search-box">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <span className="sr-only">Search conversations</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search conversations"
        />
        <kbd>⌘ K</kbd>
      </label>

      <div className="list-label">
        <span>ALL CHATS</span>
        <span className="list-dot" aria-hidden="true" />
      </div>

      <nav className="conversation-list" aria-label="Chat list">
        {conversations.map((conversation) => (
          <button
            className={`conversation-item${conversation.id === activeId ? " is-active" : ""}`}
            type="button"
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            aria-current={conversation.id === activeId ? "page" : undefined}
          >
            <span className={`avatar avatar-${conversation.avatarColor}`}>
              {conversation.initials}
              {conversation.online && <span className="online-indicator" aria-label="Online" />}
            </span>
            <span className="conversation-copy">
              <span className="conversation-topline">
                <span className="conversation-name">{conversation.name}</span>
                <span className="conversation-time">{conversation.time}</span>
              </span>
              <span className="conversation-bottomline">
                <span className="conversation-preview">{conversation.lastMessage}</span>
                {conversation.unread > 0 && <span className="unread-count">{conversation.unread}</span>}
              </span>
            </span>
          </button>
        ))}
        {conversations.length === 0 && (
          <p className="no-results">No chats match “{query}”</p>
        )}
      </nav>

      <footer className="profile-card">
        <span className="avatar avatar-profile">AL</span>
        <span className="profile-copy"><strong>Alex Lee</strong><small>Your personal space</small></span>
        <span className="profile-menu" aria-hidden="true">···</span>
      </footer>
    </aside>
  );
}
