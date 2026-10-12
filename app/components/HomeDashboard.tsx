import type { ChatUser, Conversation } from "../types/chat";
import Icon from "./Icon";

interface HomeDashboardProps {
  user: ChatUser;
  conversations: Conversation[];
  loading: boolean;
  error: string;
  theme: "light" | "dark";
  onOpenMessages: () => void;
  onOpenConversation: (id: string) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export default function HomeDashboard({ user, conversations, loading, error, theme, onOpenMessages, onOpenConversation, onOpenProfile, onLogout }: HomeDashboardProps) {
  const firstName = user.displayName.trim().split(/\s+/)[0] || "there";
  const recent = conversations.slice(0, 3);

  return (
    <main className="home-page" data-theme={theme}>
      <header className="home-topbar">
        <a className="brand" href="#home" aria-label="Haven home">
          <span className="brand-mark"><Icon name="message" size={17} strokeWidth={2.1} /></span>
          <span>haven<span className="brand-period">.</span></span>
        </a>
        <nav className="home-nav" aria-label="Main navigation">
          <button className="home-nav-link is-active" type="button" aria-current="page"><Icon name="home" size={17} />Home</button>
          <button className="home-nav-link" type="button" onClick={onOpenMessages}><Icon name="message" size={17} />Messages<span className="nav-count">{conversations.length}</span></button>
          <button className="home-nav-link" type="button" onClick={onOpenProfile}><Icon name="settings" size={17} />Profile &amp; settings</button>
        </nav>
        <div className="home-user-actions">
          <button className="home-user-button" type="button" onClick={onOpenProfile} aria-label="Open profile and settings">
            <span className="home-user-avatar">{initials(user.displayName)}</span><span>{user.displayName}</span><Icon name="chevron-down" size={15} />
          </button>
          <button className="home-logout" type="button" onClick={onLogout} aria-label="Log out" title="Log out"><Icon name="logout" size={17} /></button>
        </div>
      </header>

      <div className="home-content">
        <div className="home-page-label"><span className="home-breadcrumb-mark"><Icon name="home" size={14} /></span><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Home</strong></div>

        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-kicker"><span className="home-kicker-line" />YOUR SPACE, AT YOUR PACE</p>
            <h1>Welcome back,<br /><span>{firstName}.</span></h1>
            <p className="home-intro">A calmer place to continue the conversations that matter to you.</p>
            <div className="home-hero-actions">
              <button className="home-primary-action" type="button" onClick={onOpenMessages}>Open messages<Icon name="arrow-right" size={17} /></button>
              <button className="home-secondary-action" type="button" onClick={onOpenProfile}>Account settings</button>
            </div>
            <div className="home-hero-footnote"><span className="home-footnote-icon"><Icon name="shield" size={14} /></span>One-to-one conversations, together in one place</div>
          </div>
          <div className="home-art" aria-hidden="true">
            <div className="home-art-glow" />
            <div className="home-art-orbit orbit-one" /><div className="home-art-orbit orbit-two" />
            <div className="home-art-window">
              <div className="art-window-top"><span /><span /><span /><i>HAVEN / CONVERSATIONS</i></div>
              <div className="art-window-body">
                <div className="art-window-mark"><Icon name="message" size={21} /></div>
                <strong>Your conversations</strong>
                <small>Thoughtful chats, all in one place.</small>
                <div className="art-window-lines"><i /><i /><i /></div>
              </div>
            </div>
            <div className="art-floating-badge"><span className="art-badge-icon"><Icon name="sparkles" size={15} /></span><span><strong>Make room</strong><small>for a good conversation</small></span></div>
          </div>
        </section>

        <section className="home-overview" aria-label="Messaging overview">
          <div className="overview-item"><span className="overview-icon icon-violet"><Icon name="message" size={19} /></span><div><small>YOUR CONVERSATIONS</small><strong>{loading ? "…" : conversations.length}</strong></div><span className="overview-caption">{conversations.length === 1 ? "conversation" : "conversations"}</span></div>
          <span className="overview-divider" />
          <div className="overview-item"><span className="overview-icon icon-blue"><Icon name="sparkles" size={19} /></span><div><small>BUILT FOR</small><strong>One-to-one</strong></div><span className="overview-caption">private chats</span></div>
          <span className="overview-divider" />
          <div className="overview-item"><span className="overview-icon icon-green"><span className="overview-live-dot" /></span><div><small>MESSAGES</small><strong>Saved &amp; live</strong></div><span className="overview-caption">when connected</span></div>
        </section>

        <section className="home-lower-grid">
          <div className="recent-card">
            <div className="section-heading"><div><p className="home-section-kicker">PICK UP WHERE YOU LEFT OFF</p><h2>Recent conversations</h2></div><button className="text-link" type="button" onClick={onOpenMessages}>All messages<Icon name="arrow-right" size={15} /></button></div>
            {error ? <div className="home-data-message is-error" role="alert">{error}</div>
              : loading ? <div className="home-loading" role="status">Loading your conversations…</div>
                  : recent.length ? <div className="home-recent-list">{recent.map((conversation) => (
                  <button className="home-recent-item" type="button" key={conversation.id} onClick={() => onOpenConversation(conversation.id)}>
                    <span className={`avatar avatar-${conversation.avatarColor}`}>{conversation.initials}</span>
                    <span className="recent-copy"><strong>{conversation.name}</strong><small>{conversation.lastMessage}</small></span>
                    <span className="recent-time">{conversation.time}</span><Icon className="recent-chevron" name="arrow-right" size={15} />
                  </button>
                ))}</div>
                  : <div className="home-empty-state">
                    <span className="home-empty-icon"><Icon name="message" size={21} /></span>
                    <div><strong>Your conversations start here</strong><p>No chats yet. Open Messages to find someone by username or participant ID.</p></div>
                    <button className="home-empty-action" type="button" onClick={onOpenMessages}>Start chatting<Icon name="arrow-right" size={15} /></button>
                  </div>}
          </div>

          <aside className="home-guide-card">
            <span className="guide-card-icon"><Icon name="sparkles" size={18} /></span>
            <p className="home-section-kicker">A FEW THINGS TO KNOW</p>
            <h2>Simple by design.</h2>
            <ul>
              <li><span><Icon name="message" size={15} /></span><p><strong>One person at a time</strong><small>Private conversations with another member.</small></p></li>
              <li><span><Icon name="send" size={15} /></span><p><strong>Messages stay in sync</strong><small>Saved messages with live delivery when connected.</small></p></li>
              <li><span><Icon name="settings" size={15} /></span><p><strong>Your account, your controls</strong><small>Manage your profile and sessions in settings.</small></p></li>
            </ul>
          </aside>
        </section>
        <footer className="home-footer"><span>HAVEN</span><span>Personal conversations, thoughtfully presented.</span><button type="button" onClick={onOpenProfile}>Profile &amp; settings</button></footer>
      </div>
    </main>
  );
}
