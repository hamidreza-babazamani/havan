"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import type { ChatUser } from "../types/chat";
import Icon from "./Icon";

interface AccountProfile extends ChatUser {
  email: string;
  createdAt: string;
  emailVerified: boolean;
}

interface ActiveSession {
  current: boolean;
  createdAt: string;
  expiresAt: string;
}

interface ProfilePanelProps {
  accessToken: string;
  onBack: () => void;
  onLogout: () => void;
  onProfileUpdated: (user: ChatUser) => void;
}

function initials(value: string) {
  return value.trim().split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
}

export default function ProfilePanel({ accessToken, onBack, onLogout, onProfileUpdated }: ProfilePanelProps) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionsNotice, setSessionsNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiRequest<{ user: AccountProfile }>("/api/auth/me", {}, accessToken),
      apiRequest<{ sessions: ActiveSession[] }>("/api/auth/sessions", {}, accessToken),
    ]).then(([profileResponse, sessionsResponse]) => {
      if (cancelled) return;
      setProfile(profileResponse.user);
      setDisplayName(profileResponse.user.displayName);
      setUsername(profileResponse.user.username);
      setSessions(sessionsResponse.sessions);
      setLoadError("");
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load account details.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [accessToken]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError("");
    setProfileNotice("");
    setProfileBusy(true);
    try {
      const result = await apiRequest<{ user: AccountProfile }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName, username }),
      }, accessToken);
      setProfile(result.user);
      setDisplayName(result.user.displayName);
      setUsername(result.user.username);
      onProfileUpdated(result.user);
      setProfileNotice("Your profile has been updated.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    try {
      await apiRequest<{ success: boolean }>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }, accessToken);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice("Your password has been changed.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Could not change your password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function revokeOtherSessions() {
    setSessionsBusy(true);
    setSessionsError("");
    setSessionsNotice("");
    try {
      const result = await apiRequest<{ revoked: number }>("/api/auth/sessions", { method: "DELETE" }, accessToken);
      setSessions((current) => current.filter((session) => session.current));
      setSessionsNotice(result.revoked ? `${result.revoked} other session${result.revoked === 1 ? "" : "s"} signed out.` : "No other active sessions were found.");
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : "Could not revoke other sessions.");
    } finally {
      setSessionsBusy(false);
    }
  }

  return (
    <main className="account-page">
      <div className="account-topbar">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onBack(); }} aria-label="Haven chat home">
          <span className="brand-mark" aria-hidden="true"><Icon name="message" size={17} strokeWidth={2.1} /></span>
          <span>haven<span className="brand-period">.</span></span>
        </a>
        <button className="account-back" type="button" onClick={onBack}><Icon name="arrow-left" size={16} /> Back</button>
      </div>

      <header className="account-heading">
        <p className="eyebrow">YOUR SPACE</p>
        <h1>Profile &amp; settings</h1>
        <p>Manage your identity and keep your account up to date.</p>
      </header>

      {loading ? <section className="account-state" role="status">Loading your account…</section> : loadError ? (
        <section className="account-state account-state-error" role="alert">{loadError}</section>
      ) : profile && <div className="account-grid">
        <section className="account-card account-overview" aria-labelledby="overview-title">
          <div className="account-card-heading"><div><p className="eyebrow">ACCOUNT</p><h2 id="overview-title">Your profile</h2></div><span className="account-shield" aria-hidden="true"><Icon name="shield" size={18} /></span></div>
          <div className="account-identity">
            <div className="account-avatar" aria-label={`Avatar initials ${initials(profile.displayName)}`}>{initials(profile.displayName)}</div>
            <div><h3>{profile.displayName}</h3><p>@{profile.username}</p></div>
          </div>
          <dl className="account-details">
            <div><dt>Email address</dt><dd>{profile.email}</dd></div>
            <div><dt>Email status</dt><dd><span className={`verification-pill${profile.emailVerified ? " is-verified" : ""}`}><span aria-hidden="true">{profile.emailVerified ? "✓" : "•"}</span>{profile.emailVerified ? "Verified" : "Not verified"}</span></dd></div>
            <div><dt>Member since</dt><dd>{formatDate(profile.createdAt)}</dd></div>
          </dl>
          {!profile.emailVerified && <p className="account-footnote">Email verification isn’t configured for this demo.</p>}
        </section>

        <section className="account-card" aria-labelledby="edit-title">
          <div className="account-card-heading"><div><p className="eyebrow">PERSONAL DETAILS</p><h2 id="edit-title">Edit profile</h2></div></div>
          <form className="account-form" onSubmit={saveProfile}>
            <label>Display name<input required maxLength={80} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
            <label>Username<div className="username-field"><span aria-hidden="true">@</span><input required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value.replace(/^@/, ""))} /></div><small>3–30 letters, numbers, or underscores.</small></label>
            {profileError && <p className="account-feedback is-error" role="alert">{profileError}</p>}
            {profileNotice && <p className="account-feedback is-success" role="status">{profileNotice}</p>}
            <button className="account-primary" type="submit" disabled={profileBusy}>{profileBusy ? "Saving…" : "Save changes"}</button>
          </form>
        </section>

        <section className="account-card" aria-labelledby="password-title">
          <div className="account-card-heading"><div><p className="eyebrow">SECURITY</p><h2 id="password-title">Change password</h2></div><span className="account-lock" aria-hidden="true"><Icon name="lock" size={17} /></span></div>
          <form className="account-form" onSubmit={savePassword}>
            <label>Current password<input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label>New password<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><small>8–128 characters, with at least one letter and one number.</small></label>
            <label>Confirm new password<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
            {passwordError && <p className="account-feedback is-error" role="alert">{passwordError}</p>}
            {passwordNotice && <p className="account-feedback is-success" role="status">{passwordNotice}</p>}
            <button className="account-secondary" type="submit" disabled={passwordBusy}>{passwordBusy ? "Updating…" : "Update password"}</button>
          </form>
        </section>

        <section className="account-card account-sessions" aria-labelledby="sessions-title">
          <div className="account-card-heading"><div><p className="eyebrow">ACCESS</p><h2 id="sessions-title">Active sessions</h2></div><span className="session-count">{sessions.length}</span></div>
          <p className="account-section-copy">Sessions currently signed in to your account.</p>
          {sessions.length ? <ul className="session-list">{sessions.map((session, index) => <li key={`${session.createdAt}-${index}`}><span className={`session-device${session.current ? " is-current" : ""}`} aria-hidden="true">{session.current ? "●" : "○"}</span><span className="session-copy"><strong>{session.current ? "This session" : "Signed-in session"}</strong><small>Started {formatDate(session.createdAt)} · Expires {formatDate(session.expiresAt)}</small></span>{session.current && <span className="current-badge">CURRENT</span>}</li>)}</ul> : <p className="account-footnote">No active session details available.</p>}
          {sessionsError && <p className="account-feedback is-error" role="alert">{sessionsError}</p>}
          {sessionsNotice && <p className="account-feedback is-success" role="status">{sessionsNotice}</p>}
          <div className="session-actions"><button className="account-secondary" type="button" onClick={revokeOtherSessions} disabled={sessionsBusy || !sessions.some((session) => !session.current)}>{sessionsBusy ? "Signing out…" : "Sign out other sessions"}</button><button className="account-danger" type="button" onClick={onLogout}>Log out</button></div>
        </section>
        <p className="account-avatar-note">Profile photos aren’t supported in this demo yet. Your initials are shown instead.</p>
      </div>}
    </main>
  );
}
