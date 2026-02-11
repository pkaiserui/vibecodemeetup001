import { Link } from "react-router-dom";
import { useState } from "react";

import type { Event } from "../lib/types";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const getLocationIcon = (type: string) => {
  switch (type) {
    case "in_person": return "🏢";
    case "online": return "💻";
    case "hybrid": return "🔗";
    default: return "📍";
  }
};

const getStatusColor = (isFull: boolean, isPast: boolean) => {
  if (isPast) return "var(--text-muted)";
  if (isFull) return "var(--neon-orange)";
  return "var(--neon-green)";
};

export default function EventCard({ event }: { event: Event }) {
  const [isHovered, setIsHovered] = useState(false);
  const isFull = event.going_count >= event.capacity;
  const isPast = new Date(event.ends_at) < new Date();
  const statusColor = getStatusColor(isFull, isPast);

  const capacityPct = event.capacity ? Math.min(100, (event.going_count / event.capacity) * 100) : 0;

  return (
    <Link
      to={`/events/${event.id}`}
      className={`event-card ${isHovered ? "hovered" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="event-card-accent" aria-hidden />
      <div className="event-card-bg">
        <div className="event-card-scan" aria-hidden />
      </div>

      <div className="event-card-content">
        <header className="event-card-header">
          <span className="event-card-format">
            <span className="event-card-format-icon" aria-hidden>
              {getLocationIcon(event.location_type)}
            </span>
            {event.location_type === "in_person" ? "In person" : event.location_type === "online" ? "Online" : "Hybrid"}
          </span>
          <span
            className="event-card-status"
            style={{ ["--status-color" as string]: statusColor }}
          >
            <span className="event-card-status-dot" />
            {isPast ? "Completed" : isFull ? "Full" : "Open"}
          </span>
        </header>

        <div className="event-card-body">
          <h3 className="event-card-title">{event.title}</h3>
          <p className="event-card-description">{event.description}</p>

          <div className="event-card-meta">
            <span className="event-card-meta-item">
              <span className="event-card-meta-icon" aria-hidden>📅</span>
              {formatDate(event.starts_at)}
            </span>
            <span className="event-card-meta-item">
              <span className="event-card-meta-icon" aria-hidden>📍</span>
              {event.location_name || event.address || event.meeting_url || "Location TBA"}
            </span>
          </div>

          <div className="event-card-capacity">
            <span className="event-card-capacity-text">
              {event.going_count}<span className="event-card-capacity-sep">/</span>{event.capacity}
            </span>
            <span className="event-card-capacity-bar-wrap">
              <span
                className="event-card-capacity-bar"
                style={{ width: `${capacityPct}%` }}
              />
            </span>
          </div>
        </div>

        <footer className="event-card-footer">
          <span className="event-card-host">
            {event.organizer?.display_name || "Organizer"}
          </span>
          <span className="event-card-cta">
            {isPast ? "View" : "Join"}
            <span className="event-card-cta-arrow" aria-hidden>→</span>
          </span>
        </footer>
      </div>
    </Link>
  );
}
