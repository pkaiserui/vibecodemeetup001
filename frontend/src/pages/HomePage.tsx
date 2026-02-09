import { useCallback, useEffect, useState } from "react";

import EventCard from "../components/EventCard";
import { apiFetch } from "../lib/api";
import type { Event } from "../lib/types";

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [query, setQuery] = useState("");
  const [locationType, setLocationType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (locationType) params.set("location_type", locationType);

    try {
      const data = await apiFetch<Event[]>(`/events?${params.toString()}`);
      setEvents(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, locationType]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <div className="page">
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
            <button className="btn-secondary" onClick={() => window.location.href = '/create'}>
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
            <button className="btn-primary" onClick={() => window.location.href = '/create'}>
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
