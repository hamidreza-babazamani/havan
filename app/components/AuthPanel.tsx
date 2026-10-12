"use client";

import { useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import type { ChatUser } from "../types/chat";
import Icon from "./Icon";

interface AuthPanelProps {
  onAuthenticated: (accessToken: string, user: ChatUser) => void;
}

interface AuthResponse {
  accessToken: string;
  user: ChatUser;
}

export default function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      if (mode === "register") {
        const response = await apiRequest<{ user: ChatUser }>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, username, displayName, password }),
        });
        setMode("login");
        setPassword("");
        setNotice(`Account created. Your participant ID is ${response.user.id}. Share it so others can start a chat with you.`);
        return;
      }

      const response = await apiRequest<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onAuthenticated(response.accessToken, response.user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to continue. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="brand auth-brand" href="#home" aria-label="Haven home">
          <span className="brand-mark" aria-hidden="true"><Icon name="message" size={17} strokeWidth={2.1} /></span>
          <span>haven<span className="brand-period">.</span></span>
        </a>
        <p className="eyebrow">YOUR SPACE</p>
        <h1 id="auth-title">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-description">{mode === "login" ? "Sign in to continue your conversations." : "A few details, then you can start chatting."}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Email
            <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {mode === "register" && <>
            <label>Username
              <input required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label>Display name
              <input required maxLength={80} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
          </>}
          <label>Password
            <input type="password" required minLength={mode === "register" ? 8 : 1} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "New to Haven?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <p className="auth-footnote">Portfolio demo · messages are private to conversation members</p>
      </section>
    </main>
  );
}
