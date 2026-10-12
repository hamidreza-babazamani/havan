import { useEffect, useMemo, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import ConversationList from "./components/ConversationList";
import { initialConversations } from "./data/mockConversations";
import "./styles/chat.css";

export default function App() {
  const [apiStatus, setApiStatus] = useState<"loading" | "connected" | "error">("loading");
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0].id);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Health request failed");
        return response.json() as Promise<{ status: string }>;
      })
      .then(({ status }) => setApiStatus(status === "ok" ? "connected" : "error"))
      .catch(() => {
        if (!controller.signal.aborted) setApiStatus("error");
      });

    return () => controller.abort();
  }, []);

  const activeConversation = conversations.find(({ id }) => id === activeId);
  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conversations;
    return conversations.filter(({ name, lastMessage }) =>
      `${name} ${lastMessage}`.toLowerCase().includes(normalizedQuery),
    );
  }, [conversations, query]);

  function selectConversation(id: string) {
    setActiveId(id);
    setMobileChatOpen(true);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id ? { ...conversation, unread: 0 } : conversation,
      ),
    );
  }

  function sendMessage(text: string) {
    if (!activeConversation) return;
    const message = {
      id: `local-${Date.now()}`,
      text,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      fromMe: true,
    };
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              lastMessage: text,
              time: "now",
              messages: [...conversation.messages, message],
            }
          : conversation,
      ),
    );
  }

  return (
    <main className={`chat-shell${mobileChatOpen ? " mobile-chat-open" : ""}`} data-theme={theme}>
      <ConversationList
        conversations={filteredConversations}
        activeId={activeId}
        query={query}
        theme={theme}
        onQueryChange={setQuery}
        onSelect={selectConversation}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
      />
      {activeConversation ? (
        <ChatPanel
          conversation={activeConversation}
          apiStatus={apiStatus}
          onSend={sendMessage}
          onBack={() => setMobileChatOpen(false)}
        />
      ) : (
        <section className="empty-chat" aria-live="polite">
          <span className="empty-chat-icon" aria-hidden="true">✳</span>
          <h1>No conversations found</h1>
          <p>Try a different name or message.</p>
        </section>
      )}
    </main>
  );
}
