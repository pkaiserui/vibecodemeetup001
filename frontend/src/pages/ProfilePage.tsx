import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import EventCard from "../components/EventCard";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { RSVPWithEvent } from "../lib/types";

export default function ProfilePage() {
  const { profile, refreshProfile, ensureProfile, signOut, loading, isAuthed } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [roleUserId, setRoleUserId] = useState("");
  const [roleValue, setRoleValue] = useState<"attendee" | "organizer" | "admin">("organizer");
  const [rsvps, setRsvps] = useState<RSVPWithEvent[]>([]);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const ensureAttempted = useRef(false);

  const DICEBEAR_BASE = "https://api.dicebear.com/9.x/lorelei/svg";
  const currentAvatarUrl = previewAvatarUrl ?? profile?.avatar_url ?? null;

  const handleRefreshAvatar = () => {
    if (!profile) return;
    const seed = `${profile.id}-${Date.now()}`;
    setPreviewAvatarUrl(`${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}`);
  };

  const handleConfirmAvatar = async () => {
    if (!previewAvatarUrl || !profile) return;
    try {
      await apiFetch("/profiles/me", {
        method: "PUT",
        body: JSON.stringify({ avatar_url: previewAvatarUrl }),
      });
      await refreshProfile();
      setAvatarUrl(previewAvatarUrl);
      setPreviewAvatarUrl(null);
    } catch {
      setPreviewAvatarUrl(null);
    }
  };

  const handleRevertAvatar = () => {
    setPreviewAvatarUrl(null);
  };

  const loadRsvps = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await apiFetch<RSVPWithEvent[]>("/profiles/me/rsvps");
      setRsvps(data);
    } catch {
      setRsvps([]);
    }
  }, [profile]);

  useEffect(() => {
    loadRsvps();
  }, [loadRsvps]);

  // If session exists but profile failed to load, try ensureProfile once (creates profile if missing)
  useEffect(() => {
    if (!loading && isAuthed && !profile && !ensureAttempted.current) {
      ensureAttempted.current = true;
      ensureProfile();
    }
  }, [loading, isAuthed, profile, ensureProfile]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const now = new Date();
  const upcomingRsvps = rsvps.filter((r) => new Date(r.event.ends_at) >= now);
  const pastAttendedRsvps = rsvps.filter(
    (r) => r.rsvp_status === "checked_in" && new Date(r.event.ends_at) < now
  );

  if (loading && !profile) {
    return (
      <div className="page profile-page">
        <div className="profile-empty-state">
          <p className="muted">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page profile-page">
        <div className="profile-signin-prompt">
          <h2>Sign in to view your profile</h2>
          <p className="muted">Profiles help organizers recognize you quickly.</p>
          {isAuthed && (
            <p className="muted">
              Session exists but profile failed to load.{" "}
              <button type="button" className="ghost-button" onClick={() => ensureProfile()}>
                Retry
              </button>
            </p>
          )}
        </div>
      </div>
    );
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);

    try {
      await apiFetch("/profiles/me", {
        method: "PUT",
        body: JSON.stringify({
          display_name: displayName,
          bio,
          avatar_url: avatarUrl || null,
        }),
      });
      await refreshProfile();
      setStatus("Profile updated.");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  return (
    <div className="page profile-page">
      <h1 className="page-title">Your profile</h1>
      <p className="page-subtitle">Show up as the builder you are.</p>

      <div className="profile-layout">
        <section className="profile-identity-card" aria-label="Your identity">
          <div className="profile-identity-row">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">
                {currentAvatarUrl ? (
                  <img src={currentAvatarUrl} alt="" />
                ) : (
                  <span>{profile.display_name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="profile-avatar-actions">
                <button
                  type="button"
                  className="profile-avatar-btn profile-avatar-refresh"
                  onClick={handleRefreshAvatar}
                  title="Try a new avatar"
                  aria-label="Try a new avatar"
                >
                  ↻
                </button>
                {previewAvatarUrl && (
                  <>
                    <button
                      type="button"
                      className="profile-avatar-btn profile-avatar-confirm"
                      onClick={handleConfirmAvatar}
                      title="Set as avatar"
                      aria-label="Set as avatar"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className="profile-avatar-btn profile-avatar-revert"
                      onClick={handleRevertAvatar}
                      title="Keep original"
                      aria-label="Keep original avatar"
                    >
                      ✗
                    </button>
                  </>
                )}
              </div>
            </div>
            <div>
              <p className="profile-name">{profile.display_name}</p>
              <span className="profile-role-pill">{profile.role}</span>
            </div>
          </div>
          <p className="profile-meta">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
          <div className="profile-actions">
            <button type="button" className="ghost-button" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </section>

        <form className="profile-edit-card" onSubmit={handleSave} aria-label="Edit profile">
          <h2 className="profile-section-title">Edit profile</h2>
          <label className="field">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              aria-label="Display name"
            />
          </label>
          <label className="field">
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A bit about you..."
              aria-label="Bio"
            />
          </label>
          <label className="field">
            Avatar URL
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              aria-label="Avatar URL"
            />
          </label>
          {status && (
            <p className={status.includes("updated") ? "success" : "error"} role="status">
              {status}
            </p>
          )}
          <button className="primary-button" type="submit">
            Save changes
          </button>
        </form>

        {(upcomingRsvps.length > 0 || pastAttendedRsvps.length > 0) && (
          <div className="profile-events-section">
            {upcomingRsvps.length > 0 && (
              <div className="profile-events-block">
                <h2 className="profile-section-title">Upcoming events</h2>
                <p className="profile-section-desc">Events you&apos;re RSVP&apos;d to or checked in.</p>
                <div className="event-grid">
                  {upcomingRsvps.map((r) => (
                    <div key={r.rsvp_id} className="profile-event-wrap">
                      <span className="profile-rsvp-badge">{r.rsvp_status.replace("_", " ")}</span>
                      <EventCard event={r.event} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pastAttendedRsvps.length > 0 && (
              <div className="profile-events-block">
                <h2 className="profile-section-title">Previously attended</h2>
                <p className="profile-section-desc">Events you checked in to.</p>
                <div className="event-grid">
                  {pastAttendedRsvps.map((r) => (
                    <EventCard key={r.rsvp_id} event={r.event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {profile.role === "admin" && (
          <section className="profile-admin-card" aria-label="Admin: update member role">
            <h2 className="profile-section-title">Admin: Update a member role</h2>
            <p className="profile-section-desc">Paste the user id from Supabase auth.</p>
            <label className="field">
              User ID
              <input
                value={roleUserId}
                onChange={(e) => setRoleUserId(e.target.value)}
                placeholder="UUID from Supabase"
                aria-label="User ID"
              />
            </label>
            <label className="field">
              Role
              <select
                value={roleValue}
                onChange={(e) => setRoleValue(e.target.value as "attendee" | "organizer" | "admin")}
                aria-label="Role"
              >
                <option value="attendee">Attendee</option>
                <option value="organizer">Organizer</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              className="ghost-button"
              type="button"
              onClick={async () => {
                try {
                  await apiFetch("/admin/roles", {
                    method: "POST",
                    body: JSON.stringify({ user_id: roleUserId, role: roleValue }),
                  });
                  setStatus("Role updated.");
                } catch (err) {
                  setStatus((err as Error).message);
                }
              }}
            >
              Update role
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
