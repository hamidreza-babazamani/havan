import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ChatMessage, Conversation } from "../types/chat";
import EmojiPicker from "./EmojiPicker";
import Icon from "./Icon";

interface ChatPanelProps {
  conversation: Conversation;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messageError: string;
  sendError: string;
  realtimeStatus: "off" | "connecting" | "connected" | "unavailable";
  pinnedMessages: ChatMessage[];
  onSend: (text: string) => Promise<boolean>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onTogglePin: (message: ChatMessage) => Promise<void>;
  onLoadPinnedMessage: (message: ChatMessage) => void;
  onRetry: () => void;
  onBack: () => void;
  onOpenHome: () => void;
}

export default function ChatPanel({ conversation, messages, messagesLoading, messageError, sendError, realtimeStatus, pinnedMessages, onSend, onDeleteMessage, onTogglePin, onLoadPinnedMessage, onRetry, onBack, onOpenHome }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [voicePreviewOpen, setVoicePreviewOpen] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [pinnedListOpen, setPinnedListOpen] = useState(false);
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const draftInputRef = useRef<HTMLTextAreaElement>(null);
  const draftSelection = useRef({ start: 0, end: 0 });
  const messageListRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation.id, messages.length]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  useEffect(() => {
    if (!jumpTargetId || !messages.some((message) => message.id === jumpTargetId)) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(`message-${jumpTargetId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(jumpTargetId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedMessageId(null), 1800);
    });
    return () => cancelAnimationFrame(frame);
  }, [jumpTargetId, messages]);

  useEffect(() => {
    if (!messageMenuId) return;
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMessageMenuId(null);
    };
    document.addEventListener("keydown", closeMenu);
    return () => document.removeEventListener("keydown", closeMenu);
  }, [messageMenuId]);

  function showDemo(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (await onSend(text)) setDraft("");
    } finally {
      setSending(false);
    }
  }

  function rememberDraftSelection(input: HTMLTextAreaElement) {
    draftSelection.current = {
      start: input.selectionStart ?? input.value.length,
      end: input.selectionEnd ?? input.value.length,
    };
  }

  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function resizeComposer(input: HTMLTextAreaElement) {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  function insertEmoji(emoji: string) {
    const input = draftInputRef.current;
    const start = Math.min(draftSelection.current.start, draft.length);
    const end = Math.min(Math.max(draftSelection.current.end, start), draft.length);
    const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    const nextCursor = start + emoji.length;
    setDraft(nextDraft);
    draftSelection.current = { start: nextCursor, end: nextCursor };
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function togglePin(message: ChatMessage) {
    setActionBusy(true);
    setActionError("");
    try {
      await onTogglePin(message);
      setMessageMenuId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update the pinned message.");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmDeleteMessage() {
    if (!deleteTarget) return;
    setActionBusy(true);
    setActionError("");
    try {
      await onDeleteMessage(deleteTarget.id);
      setDeleteTarget(null);
      setMessageMenuId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete this message.");
    } finally {
      setActionBusy(false);
    }
  }

  function jumpToPinnedMessage(message: ChatMessage) {
    onLoadPinnedMessage(message);
    setPinnedListOpen(false);
    setJumpTargetId(message.id);
    if (messages.some((item) => item.id === message.id)) {
      document.getElementById(`message-${message.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  const liveLabel = realtimeStatus === "connected" ? "Live · saved messages"
    : realtimeStatus === "connecting" ? "Connecting…"
      : realtimeStatus === "unavailable" ? "Live unavailable" : "Saved messages";

  return (
    <section className="chat-panel" aria-label={`Conversation with ${conversation.name}`}>
      <header className="chat-header">
        <button className="mobile-back" type="button" onClick={onBack} aria-label="Back to conversations"><Icon name="arrow-left" size={18} /></button>
        <span className={`avatar header-avatar avatar-${conversation.avatarColor}`}>{conversation.initials}</span>
        <div className="chat-contact"><h2>{conversation.name}</h2><p><span className="status-dot" />Private conversation</p></div>
        <div className="chat-header-actions">
          <span className={`api-status${realtimeStatus === "connected" ? " api-connected" : realtimeStatus === "unavailable" ? " api-error" : ""}`} role="status"><span className="api-status-dot" />{liveLabel}</span>
          <span className="private-label">Private · one-to-one</span>
          <button className="icon-button home-header-button" type="button" onClick={onOpenHome} aria-label="Go to Home" title="Home"><Icon name="home" size={17} /></button>
          <button className="icon-button call-button" type="button" onClick={() => showDemo("Voice calls are a visual demo in this project.")} aria-label="Voice call demo" title="Voice call (demo)"><Icon name="phone" size={17} /></button>
          <button className="icon-button call-button" type="button" onClick={() => showDemo("Video calls are a visual demo in this project.")} aria-label="Video call demo" title="Video call (demo)"><Icon name="video" size={18} /></button>
        </div>
      </header>

      {pinnedMessages.length > 0 && <div className="pinned-banner">
        <span className="pinned-banner-icon"><Icon name="pin" size={16} /></span>
        <span className="pinned-banner-copy"><strong>{pinnedMessages.length} pinned {pinnedMessages.length === 1 ? "message" : "messages"}</strong><small>{pinnedMessages[0].text}</small></span>
        <button className="pinned-view-button" type="button" onClick={() => setPinnedListOpen((open) => !open)} aria-expanded={pinnedListOpen}>View</button>
        {pinnedListOpen && <div className="pinned-list-popover" role="group" aria-label="Pinned messages">
          <div className="pinned-popover-heading"><strong>Pinned messages</strong><button type="button" onClick={() => setPinnedListOpen(false)} aria-label="Close pinned messages"><Icon name="x" size={15} /></button></div>
          {pinnedMessages.map((message) => <button className="pinned-list-item" type="button" key={message.id} onClick={() => jumpToPinnedMessage(message)}>
            <span className={`pinned-mini-avatar avatar-${conversation.avatarColor}`}>{message.fromMe ? "You" : conversation.initials}</span>
            <span><strong>{message.fromMe ? "You" : conversation.name}</strong><small>{message.text}</small></span>
            <Icon name="arrow-right" size={14} />
          </button>)}
        </div>}
      </div>}

      {actionError && <div className="message-action-error" role="alert">{actionError}<button type="button" onClick={() => setActionError("")} aria-label="Dismiss error"><Icon name="x" size={14} /></button></div>}

      <div className="message-list" ref={messageListRef} aria-live="polite">
        {messagesLoading && <p className="message-state" role="status">Loading messages…</p>}
        {messageError && <p className="message-state message-state-error" role="alert">{messageError} <button type="button" onClick={onRetry}>Try again</button></p>}
        {!messagesLoading && !messageError && messages.length === 0 && <div className="chat-empty-state"><span className="empty-orb"><Icon name="send" size={22} /></span><p className="empty-state-title">A little space for a good conversation.</p><p>Your messages with {conversation.name} will appear here.</p></div>}
        {!messagesLoading && !messageError && messages.map((message, index) => {
          const previousMessage = messages[index - 1];
          const showAuthor = !message.fromMe && (!previousMessage || previousMessage.fromMe);
          return (
            <div className={`message-group${highlightedMessageId === message.id ? " is-highlighted" : ""}`} id={`message-${message.id}`} key={message.id}>
              {(!previousMessage || previousMessage.day !== message.day) && <div className="day-divider"><span /><time>{message.day}</time><span /></div>}
              <div className={`message-row${message.fromMe ? " from-me" : " from-them"}`}>
                {!message.fromMe && <span className={`message-avatar avatar-${conversation.avatarColor}`}>{showAuthor ? conversation.initials : ""}</span>}
                <div className="message-content">
                  {showAuthor && <span className="message-author">{conversation.name.split(" ")[0]}</span>}
                  <div className="message-bubble-row">
                    <div className="message-bubble">
                      {message.pinnedAt && <span className="message-pinned-label"><Icon name="pin" size={12} />Pinned</span>}
                      <span>{message.text}</span>
                    </div>
                    <button className="message-action-trigger" type="button" onClick={() => setMessageMenuId((current) => current === message.id ? null : message.id)} aria-label={`Actions for ${message.fromMe ? "your" : `${conversation.name}'s`} message`} aria-haspopup="menu" aria-expanded={messageMenuId === message.id} title="Message actions"><Icon name="more" size={18} /></button>
                    {messageMenuId === message.id && <div className="message-action-menu" role="menu" aria-label="Message actions">
                      <button type="button" role="menuitem" disabled={actionBusy} onClick={() => void togglePin(message)}><Icon name="pin" size={15} />{message.pinnedAt ? "Unpin message" : "Pin message"}</button>
                      {message.fromMe && <button className="delete-menu-item" type="button" role="menuitem" disabled={actionBusy} onClick={() => { setDeleteTarget(message); setMessageMenuId(null); }}><Icon name="trash" size={15} />Delete message</button>}
                    </div>}
                  </div>
                  <time className="message-time">{message.time}{message.fromMe && <span className="sent-check" aria-label="Sent"> <Icon name="check" size={12} /></span>}</time>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {voicePreviewOpen && <div className="voice-preview" role="group" aria-label="Voice message demo preview">
        <span className="voice-preview-icon"><Icon name="mic" size={16} /></span>
        <span className="voice-preview-copy"><strong>Voice message</strong><small>Demo preview · recording is unavailable</small></span>
        <span className="waveform" aria-hidden="true">{Array.from({ length: 34 }, (_, index) => <i key={index} style={{ "--wave-height": `${16 + ((index * 19) % 29)}%` } as React.CSSProperties} />)}</span>
        <button className="voice-preview-play" type="button" onClick={() => showDemo("Voice recording and playback are placeholders.")} aria-label="Play voice message demo"><span /></button>
        <button className="icon-button voice-close" type="button" onClick={() => setVoicePreviewOpen(false)} aria-label="Close voice message preview"><Icon name="x" size={15} /></button>
      </div>}

      <form className="composer" onSubmit={handleSubmit}>
        <div className="composer-tools">
          <div className="composer-popover-anchor">
            <button className={`composer-tool${attachmentOpen ? " is-selected" : ""}`} type="button" onClick={() => { setAttachmentOpen((open) => !open); setEmojiOpen(false); }} aria-label="Open attachment options" aria-expanded={attachmentOpen} title="Attach (demo)"><Icon name="paperclip" size={17} /></button>
            {attachmentOpen && <div className="composer-popover attachment-menu" role="menu" aria-label="Attachment options">
              <p>Share something</p>
              <button type="button" role="menuitem" onClick={() => { setAttachmentOpen(false); showDemo("Image sharing is a visual demo; nothing was uploaded."); }}><Icon name="image" size={17} /><span>Image<small>Photo or picture</small></span></button>
              <button type="button" role="menuitem" onClick={() => { setAttachmentOpen(false); showDemo("Video sharing is a visual demo; nothing was uploaded."); }}><Icon name="video" size={17} /><span>Video<small>Video clip</small></span></button>
              <button type="button" role="menuitem" onClick={() => { setAttachmentOpen(false); showDemo("File sharing is a visual demo; nothing was uploaded."); }}><Icon name="file" size={17} /><span>File<small>Document or file</small></span></button>
            </div>}
          </div>
          <button className={`composer-tool voice-tool${voicePreviewOpen ? " is-selected" : ""}`} type="button" onClick={() => { setVoicePreviewOpen((open) => !open); showDemo("Voice messages are a visual demo. No audio is recorded."); }} aria-label="Show voice message demo" title="Voice message (demo)"><Icon name="mic" size={17} /></button>
        </div>
        <label className="composer-field">
          <span className="sr-only">Write a message. Press Enter to send or Shift plus Enter for a new line.</span>
          <textarea ref={draftInputRef} value={draft} rows={1} onChange={(event) => { setDraft(event.target.value); resizeComposer(event.currentTarget); rememberDraftSelection(event.currentTarget); }} onKeyDown={handleComposerKeyDown} onSelect={(event) => rememberDraftSelection(event.currentTarget)} onClick={(event) => rememberDraftSelection(event.currentTarget)} onBlur={(event) => rememberDraftSelection(event.currentTarget)} placeholder="پیامت رو بنویس..." autoComplete="off" maxLength={2000} disabled={messagesLoading || Boolean(messageError)} />
          <span className="composer-hint">Enter to send</span>
        </label>
        <div className="composer-tools composer-tools-end">
          <EmojiPicker open={emojiOpen} onToggle={() => { setEmojiOpen((open) => !open); setAttachmentOpen(false); }} onClose={() => setEmojiOpen(false)} onSelect={insertEmoji} />
          <button className="send-button" type="submit" disabled={!draft.trim() || sending || messagesLoading || Boolean(messageError)} aria-label="Send message"><Icon name="send" size={18} /></button>
        </div>
        <p className={`composer-caption${sendError ? " composer-caption-error" : ""}`}>{sendError || "Private conversation · messages are saved"}</p>
      </form>

      {deleteTarget && <div className="confirm-backdrop">
        <section className="message-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-message-title" aria-describedby="delete-message-description">
          <span className="confirm-icon"><Icon name="trash" size={19} /></span>
          <h2 id="delete-message-title">Delete this message?</h2>
          <p id="delete-message-description">This permanently removes the message for everyone in this conversation.</p>
          <div className="confirm-actions"><button type="button" onClick={() => setDeleteTarget(null)} disabled={actionBusy}>Cancel</button><button className="confirm-delete-button" type="button" onClick={() => void confirmDeleteMessage()} disabled={actionBusy}>{actionBusy ? "Deleting…" : "Delete message"}</button></div>
        </section>
      </div>}

      {toast && <div className="demo-toast" role="status"><span className="demo-toast-mark">i</span>{toast}</div>}
    </section>
  );
}
