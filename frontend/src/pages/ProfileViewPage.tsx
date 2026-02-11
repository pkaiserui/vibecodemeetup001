import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { publicApiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Profile } from "../lib/auth";

export default function ProfileViewPage() {
  const { userId } = useParams();
  const { profile: currentProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    publicApiFetch<Profile>(`/profiles/${userId}`)
      .then(setProfile)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="page profile-page">
        <p className="muted">Loading profile…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page profile-page">
        <p className="error">{error ?? "Profile not found."}</p>
        <Link to="/" className="ghost-button" style={{ marginTop: "1rem", display: "inline-block" }}>
          Back to home
        </Link>
      </div>
    );
  }

  const isOwnProfile = currentProfile && currentProfile.id === profile.id;

  return (
    <div className="page profile-page">
      {isOwnProfile && (
        <Link to="/profile" className="ghost-button" style={{ marginBottom: "1rem", display: "inline-block" }}>
          ← Edit your profile
        </Link>
      )}
      <div className="profile-layout">
        <section className="profile-identity-card profile-identity-card--view" aria-label="Profile">
          <div className="profile-identity-row">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  <span>{profile.display_name.slice(0, 2).toUpperCase()}</span>
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
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        </section>
      </div>
    </div>
  );
}
