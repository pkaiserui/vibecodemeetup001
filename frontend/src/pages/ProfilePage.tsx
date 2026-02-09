import { useState, type FormEvent } from "react";

import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [roleUserId, setRoleUserId] = useState("");
  const [roleValue, setRoleValue] = useState<"attendee" | "organizer" | "admin">("organizer");

  if (!profile) {
    return (
      <div className="page">
        <div className="panel">
          <h1>Sign in to view your profile</h1>
          <p className="muted">Profiles help organizers recognize you quickly.</p>
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
    <div className="page">
      <h1 className="page-title">Your profile</h1>
      <p className="page-subtitle">Show up as the builder you are.</p>

      <div className="profile-grid">
        <div className="panel">
          <div className="profile-header">
            <div className="avatar">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} />
              ) : (
                <span>{profile.display_name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h2>{profile.display_name}</h2>
              <p className="muted">Role: {profile.role}</p>
            </div>
          </div>
          <p className="muted">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
        </div>

        <form className="panel form" onSubmit={handleSave}>
          <label className="field">
            Display name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label className="field">
            Bio
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
          </label>
          <label className="field">
            Avatar URL
            <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </label>
          {status && <p className={status.includes("updated") ? "success" : "error"}>{status}</p>}
          <button className="primary-button" type="submit">
            Save changes
          </button>
        </form>
      </div>

      {profile.role === "admin" && (
        <div className="panel form" style={{ marginTop: "20px" }}>
          <h2>Admin: Update a member role</h2>
          <p className="muted">Paste the user id from Supabase auth.</p>
          <label className="field">
            User ID
            <input value={roleUserId} onChange={(e) => setRoleUserId(e.target.value)} />
          </label>
          <label className="field">
            Role
            <select value={roleValue} onChange={(e) => setRoleValue(e.target.value as any)}>
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
        </div>
      )}
    </div>
  );
}
