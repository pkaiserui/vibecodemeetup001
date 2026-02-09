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

  return (
    <Link
      to={`/events/${event.id}`}
      className={`event-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="event-card-bg">
        <div className="event-card-scan"></div>
      </div>

      <div className="event-card-content">
        <div className="event-card-header">
          <div className="event-type-badge">
            <span className="event-type-icon">{getLocationIcon(event.location_type)}</span>
            <span className="event-type-text">
              {event.location_type === "in_person"
                ? "IN PERSON"
                : event.location_type === "online"
                ? "ONLINE"
                : "HYBRID"}
            </span>
          </div>

          <div className="event-status">
            <div
              className="status-indicator"
              style={{ backgroundColor: statusColor }}
            ></div>
            <span className="status-text">
              {isPast ? "COMPLETED" : isFull ? "FULL" : "OPEN"}
            </span>
          </div>
        </div>

        <div className="event-card-body">
          <h3 className="event-title">{event.title}</h3>
          <p className="event-description">{event.description}</p>

          <div className="event-details">
            <div className="event-detail">
              <span className="detail-icon">📅</span>
              <span className="detail-text">{formatDate(event.starts_at)}</span>
            </div>

            <div className="event-detail">
              <span className="detail-icon">📍</span>
              <span className="detail-text">
                {event.location_name || event.address || event.meeting_url || "LOCATION TBA"}
              </span>
            </div>

            <div className="event-detail">
              <span className="detail-icon">👥</span>
              <span
                className="detail-text"
                style={{ color: statusColor }}
              >
                {event.going_count}/{event.capacity} ATTENDING
              </span>
            </div>
          </div>
        </div>

        <div className="event-card-footer">
          <div className="organizer-info">
            <span className="organizer-label">HOSTED BY</span>
            <span className="organizer-name">{event.organizer?.display_name || "ORGANIZER"}</span>
          </div>

          <div className="event-action">
            <span className="action-text">
              {isPast ? "VIEW DETAILS" : "JOIN EVENT"}
            </span>
            <span className="action-arrow">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
