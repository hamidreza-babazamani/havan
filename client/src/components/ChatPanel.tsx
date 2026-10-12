import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Conversation } from "../data/mockConversations";

interface ChatPanelProps {
  conversation: Conversation;
  apiStatus: "loading" | "connected" | "error";
  onSend: (text: string) => void;
  onBack: () => void;
}

export default function ChatPanel({ conversation, apiStatus, onSend, onBack }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation.id, conversation.messages.length]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <section className="chat-panel" aria-label={`Conversation with ${conversation.name}`}>
      <header className="chat-header">
        <button className="mobile-back" type="button" onClick={onBack} aria-label="Back to conversations">
          <span aria-hidden="true">←</span>
        </button>
        <span className={`avatar header-avatar avatar-${conversation.avatarColor}`}>
          {conversation.initials}
          {conversation.online && <span className="online-indicator" aria-label="Online" />}
        </span>
        <div className="chat-contact">
          <h2>{conversation.name}</h2>
          <p><span className={`status-dot${conversation.online ? " is-online" : ""}`} />{conversation.online ? "Active now" : "Offline"}</p>
        </div>
        <div className="chat-header-actions">
          <span className={`api-status api-${apiStatus}`} role="status">
            <span className="api-status-dot" />
            {apiStatus === "loading" ? "API checking" : apiStatus === "connected" ? "API connected" : "API unavailable"}
          </span>
          <span className="private-label"><span aria-hidden="true">✳</span> Private chat</span>
          <button className="icon-button more-button" type="button" aria-label="More conversation options" title="Conversation details">···</button>
        </div>
      </header>

      <div className="message-list" ref={messageListRef} aria-live="polite">
        <div className="day-divider"><span /> <time>Today</time> <span /></div>
        {conversation.messages.map((message, index) => {
          const previousMessage = conversation.messages[index - 1];
          const showAuthor = !message.fromMe && (!previousMessage || previousMessage.fromMe);
          return (
            <div className={`message-row${message.fromMe ? " from-me" : " from-them"}`} key={message.id}>
              {!message.fromMe && <span className={`message-avatar avatar-${conversation.avatarColor}`}>{showAuthor ? conversation.initials : ""}</span>}
              <div className="message-content">
                {showAuthor && <span className="message-author">{conversation.name.split(" ")[0]}</span>}
                <div className="message-bubble">{message.text}</div>
                <time className="message-time">{message.time}{message.fromMe && <span className="sent-check" aria-label="Sent"> ✓</span>}</time>
              </div>
            </div>
          );
        })}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <label className="composer-field">
          <span className="sr-only">Write a message</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${conversation.name.split(" ")[0]}...`}
            autoComplete="off"
          />
          <span className="composer-hint">Enter to send</span>
        </label>
        <button className="send-button" type="submit" disabled={!draft.trim()} aria-label="Send message">
          <span aria-hidden="true">↑</span>
        </button>
        <p className="composer-caption"><span aria-hidden="true">◇</span> Your conversations are just between you two.</p>
      </form>
    </section>
  );
}
