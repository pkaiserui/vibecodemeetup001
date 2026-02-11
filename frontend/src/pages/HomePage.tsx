import { useCallback, useEffect, useState } from "react";

import EventCard from "../components/EventCard";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Event } from "../lib/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function HomePage() {
  const { profile, refreshProfile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [query, setQuery] = useState("");
  const [locationType, setLocationType] = useState("");
  const [nearZip, setNearZip] = useState<string | null>(null);
  const [nearInput, setNearInput] = useState("");
  const [nearExpanded, setNearExpanded] = useState(false);
  const [nearLoading, setNearLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use saved location from profile when logged in
  useEffect(() => {
    if (profile?.location_zip && profile.location_zip.length >= 5) {
      setNearZip(profile.location_zip.slice(0, 5));
    }
  }, [profile?.location_zip]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (locationType) params.set("location_type", locationType);
    if (nearZip) params.set("near", nearZip);

    try {
      const data = await apiFetch<Event[]>(`/events?${params.toString()}`);
      setEvents(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, locationType, nearZip]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <div className="page discover-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-grid"></div>
          <div className="hero-particles"></div>
        </div>

        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="hero-title-main">VIBE CODING</span>
              <span className="hero-title-sub">// MEETUPS & HACK NIGHTS</span>
            </h1>
            <p className="hero-description">
              DISCOVER HACK NIGHTS, CREATIVE CODING SESSIONS, AND BUILDER MEETUPS DESIGNED FOR REAL MOMENTUM.
              CONNECT WITH LIKE-MINDED DEVELOPERS IN YOUR AREA.
            </p>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{events.length}</span>
              <span className="stat-label">EVENTS</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {events.reduce((acc, event) => acc + event.going_count, 0)}
              </span>
              <span className="stat-label">ATTENDEES</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {new Set(events.map(e => e.organizer_id)).size}
              </span>
              <span className="stat-label">HOSTS</span>
            </div>
          </div>

          <div className="hero-actions">
            <button className="btn-primary" onClick={() => document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })}>
              <span className="btn-icon">🔍</span>
              FIND EVENTS
            </button>
            <button className="btn-secondary" onClick={() => window.location.href = '/host'}>
              <span className="btn-icon">🚀</span>
              HOST EVENT
            </button>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section id="search-section" className="search-section">
        <div className="search-container">
          <h2 className="section-title">DISCOVER EVENTS</h2>

          <div className="search-filters">
            <div className="search-input-group">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search events, topics, or hosts..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadEvents();
                }}
              />
            </div>

            <select
              className="filter-select"
              value={locationType}
              onChange={(event) => setLocationType(event.target.value)}
            >
              <option value="">ALL FORMATS</option>
              <option value="in_person">IN PERSON</option>
              <option value="online">ONLINE</option>
              <option value="hybrid">HYBRID</option>
            </select>

            <div className="near-location-control">
              <button
                type="button"
                className={`ghost-button near-toggle ${nearZip ? "active" : ""}`}
                onClick={() => setNearExpanded(!nearExpanded)}
              >
                📍 Nearest to location {nearZip ? `(${nearZip})` : ""}
              </button>
              {nearExpanded && (
                <div className="near-options">
                  <button
                    type="button"
                    className="ghost-button near-option-btn"
                    disabled={nearLoading}
                    onClick={async () => {
                      setNearLoading(true);
                      setError(null);
                      try {
                        const r = await fetch(`${API_BASE}/location/from-ip`);
                        const data = await r.json();
                        if (data.zip) {
                          const zip = String(data.zip).slice(0, 5);
                          setNearZip(zip);
                          setNearExpanded(false);
                          if (profile) {
                            await apiFetch("/profiles/me", {
                              method: "PUT",
                              body: JSON.stringify({ location_zip: zip }),
                            });
                            await refreshProfile();
                          }
                        } else {
                          setError(data.error || "Could not detect location");
                        }
                      } catch {
                        setError("Could not detect location");
                      } finally {
                        setNearLoading(false);
                      }
                    }}
                  >
                    {nearLoading ? "Detecting..." : "Use my location (IP)"}
                  </button>
                  <div className="near-zip-row">
                    <input
                      className="search-input near-zip-input"
                      placeholder="Or enter zip"
                      value={nearInput}
                      onChange={(e) => setNearInput(e.target.value)}
                      maxLength={10}
                    />
                    <button
                      type="button"
                      className="primary-button"
                      onClick={async () => {
                        const z = nearInput.trim().replace(/\D/g, "").slice(0, 5);
                        if (z.length >= 5) {
                          setNearZip(z);
                          setNearInput("");
                          setNearExpanded(false);
                          if (profile) {
                            try {
                              await apiFetch("/profiles/me", {
                                method: "PUT",
                                body: JSON.stringify({ location_zip: z }),
                              });
                              await refreshProfile();
                            } catch {
                              // Non-blocking; zip still applied locally
                            }
                          }
                        }
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  {nearZip && (
                    <button
                      type="button"
                      className="ghost-button near-clear"
                      onClick={async () => {
                        setNearZip(null);
                        setNearExpanded(false);
                        if (profile) {
                          try {
                            await apiFetch("/profiles/me", {
                              method: "PUT",
                              body: JSON.stringify({ location_zip: "" }),
                            });
                            await refreshProfile();
                          } catch {
                            // Non-blocking
                          }
                        }
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            <button className="btn-primary" onClick={loadEvents}>
              <span className="btn-icon">⚡</span>
              SEARCH
            </button>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="events-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">LOADING EVENTS...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">ERROR LOADING EVENTS</h3>
            <p className="error-message">{error}</p>
            <button className="btn-secondary" onClick={loadEvents}>
              TRY AGAIN
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3 className="empty-title">NO EVENTS FOUND</h3>
            <p className="empty-description">
              BE THE FIRST TO HOST A VIBE CODING MEETUP IN YOUR AREA.
            </p>
            <button className="btn-primary" onClick={() => window.location.href = '/host'}>
              <span className="btn-icon">🚀</span>
              CREATE EVENT
            </button>
          </div>
        ) : (
          <div className="event-grid">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
