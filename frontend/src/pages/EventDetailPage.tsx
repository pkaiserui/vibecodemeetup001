import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";

import { apiFetch, publicApiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Event, Project, Review, RSVP } from "../lib/types";

const DEFAULT_TOOLS = [
  "Vercel",
  "Supabase",
  "Cursor",
  "Copilot",
  "GitHub",
  "VS Code",
];

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });

/** Start/End in details panel: weekday (Monday–Sunday), calendar date, and time */
const formatTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function EventDetailPage() {
  const { eventId } = useParams();
  const { isAuthed, profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvp, setRsvp] = useState<RSVP | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [projectLink, setProjectLink] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTools, setProjectTools] = useState<string[]>([]);
  const [customToolInput, setCustomToolInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);

    try {
      // Use publicApiFetch for data that should be visible to everyone
      const [eventData, reviewsData, projectsData] = await Promise.all([
        publicApiFetch<Event>(`/events/${eventId}`),
        publicApiFetch<Review[]>(`/events/${eventId}/reviews`),
        publicApiFetch<Project[]>(`/events/${eventId}/projects`),
      ]);
      setEvent(eventData);
      setReviews(reviewsData);
      setProjects(projectsData);

      if (isAuthed) {
        try {
          const rsvpData = await apiFetch<RSVP>(`/events/${eventId}/rsvp`);
          setRsvp(rsvpData);
        } catch {
          setRsvp(null);
        }
      } else {
        setRsvp(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [eventId, isAuthed]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleRsvp = async () => {
    if (!eventId) return;
    try {
      const data = await apiFetch<RSVP>(`/events/${eventId}/rsvp`, { method: "POST" });
      setRsvp(data);
      await loadEvent();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCancel = async () => {
    if (!eventId) return;
    try {
      const data = await apiFetch<RSVP>(`/events/${eventId}/rsvp`, { method: "DELETE" });
      setRsvp(data);
      await loadEvent();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCheckin = async () => {
    if (!eventId) return;
    try {
      const data = await apiFetch<RSVP>(`/events/${eventId}/checkin`, { method: "POST" });
      setRsvp(data);
      await loadEvent();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    try {
      const data = await apiFetch<Review>(`/events/${eventId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
      setReviews((prev) => [data, ...prev.filter((review) => review.id !== data.id)]);
      setComment("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleShareEvent = async () => {
    if (!eventId) return;
    const url = `${window.location.origin}/events/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  };

  const handleAddProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventId || !projectLink.trim()) return;
    try {
      const data = await apiFetch<Project>(`/events/${eventId}/projects`, {
        method: "POST",
        body: JSON.stringify({
          link: projectLink.trim(),
          title: projectTitle.trim() || null,
          description: projectDescription.trim() || null,
          tools_used: projectTools.length > 0 ? projectTools : null,
        }),
      });
      setProjects((prev) => [...prev, data]);
      setProjectLink("");
      setProjectTitle("");
      setProjectDescription("");
      setProjectTools([]);
      setCustomToolInput("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const addProjectTool = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !projectTools.includes(trimmed)) {
      setProjectTools((prev) => [...prev, trimmed]);
    }
  };

  const removeProjectTool = (name: string) => {
    setProjectTools((prev) => prev.filter((t) => t !== name));
  };

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading event...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page">
        <p className="muted">Event not found.</p>
      </div>
    );
  }

  const isFull = event.going_count >= event.capacity;
  const canReview = rsvp && (rsvp.status === "going" || rsvp.status === "checked_in");
  const canAddProject = rsvp && rsvp.status === "checked_in";
  const showProjectsSection = projects.length > 0 || canAddProject;
  const isHost = isAuthed && profile && profile.id === event.organizer_id;

  return (
    <div className="page event-detail">
      <section className="event-hero">
        <div>
          <p className="event-kicker">
            {event.location_type === "in_person"
              ? "In person"
              : event.location_type === "online"
              ? "Online"
              : "Hybrid"}
          </p>
          <h1>{event.title}</h1>
          <p className="event-date">{formatDate(event.starts_at)}</p>
        </div>
        <div className="event-actions">
          <button
            type="button"
            className={`ghost-button event-share-button${shareCopied ? " event-share-copied" : ""}`}
            onClick={handleShareEvent}
            aria-label={shareCopied ? "Link copied" : "Copy event link"}
          >
            <span className="event-action-icon" aria-hidden>
              {shareCopied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              )}
            </span>
            {shareCopied ? "Copied!" : "Share event"}
          </button>
          {isHost && (
            <Link to={`/events/${eventId}/edit`} className="ghost-button">
              <span className="event-action-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
              Edit event
            </Link>
          )}
          {!isAuthed ? (
            <Link to="/auth" className="muted" style={{ textDecoration: "underline" }}>
              Sign in to RSVP or review.
            </Link>
          ) : rsvp ? (
            <>
              <div className={`status-pill ${rsvp.status}`}>
                {rsvp.status === "going" && "You are going"}
                {rsvp.status === "waitlist" && "On the waitlist"}
                {rsvp.status === "checked_in" && "Checked in"}
              </div>
              {rsvp.status !== "checked_in" && (
                <button className="ghost-button" onClick={handleCancel}>
                  Cancel RSVP
                </button>
              )}
              {rsvp.status === "going" && (
                <button className="primary-button" onClick={handleCheckin}>
                  <span className="event-action-icon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  Check in now
                </button>
              )}
            </>
          ) : (
            <button className="primary-button" onClick={handleRsvp}>
              <span className="event-action-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              {isFull ? "Join waitlist" : "RSVP"}
            </button>
          )}
        </div>
      </section>

      <section className="event-body">
        <div className="event-main">
          <div className="panel">
            <h2>About this event</h2>
            <p>{event.description}</p>
          </div>
          <div className="panel event-details-panel">
            <h2 className="event-details-heading">Details</h2>
            <dl className="event-details-list">
              <div className="event-detail-row">
                <dt className="event-detail-key">Format</dt>
                <dd className="event-detail-value">
                  <span className="event-detail-icon" aria-hidden>
                    {event.location_type === "in_person" ? "🏢" : event.location_type === "online" ? "💻" : "🔗"}
                  </span>
                  {event.location_type === "in_person" ? "In person" : event.location_type === "online" ? "Online" : "Hybrid"}
                </dd>
              </div>
              <div className="event-detail-row">
                <dt className="event-detail-key">Location</dt>
                <dd className="event-detail-value">
                  <span className="event-detail-icon" aria-hidden>📍</span>
                  {event.location_name || event.address || event.meeting_url || "TBA"}
                </dd>
              </div>
              <div className="event-detail-row">
                <dt className="event-detail-key">Start</dt>
                <dd className="event-detail-value">
                  <span className="event-detail-icon" aria-hidden>🕐</span>
                  {formatTime(event.starts_at)}
                </dd>
              </div>
              <div className="event-detail-row">
                <dt className="event-detail-key">End</dt>
                <dd className="event-detail-value">
                  <span className="event-detail-icon" aria-hidden>🕐</span>
                  {formatTime(event.ends_at)}
                </dd>
              </div>
              <div className={`event-detail-row event-detail-row-capacity ${isFull ? "event-detail-row-full" : ""}`}>
                <dt className="event-detail-key">Capacity</dt>
                <dd className="event-detail-value">
                  <span className="event-detail-capacity-text">
                    {event.going_count}<span className="event-detail-capacity-sep">/</span>{event.capacity}
                  </span>
                  <span className="event-detail-capacity-bar-wrap">
                    <span
                      className="event-detail-capacity-bar"
                      style={{ width: `${Math.min(100, (event.going_count / event.capacity) * 100)}%` }}
                    />
                  </span>
                  <span className="event-detail-meta">going</span>
                </dd>
              </div>
              <div className="event-detail-row">
                <dt className="event-detail-key">Waitlist</dt>
                <dd className="event-detail-value">
                  <span className="event-detail-icon" aria-hidden>⏳</span>
                  {event.waitlist_count} waiting
                </dd>
              </div>
              <div className="event-detail-row">
                <dt className="event-detail-key">Organizer</dt>
                <dd className="event-detail-value">
                  <span className="event-detail-icon" aria-hidden>👤</span>
                  {event.organizer_display_name ?? event.organizer_id}
                </dd>
              </div>
            </dl>
          </div>

          <div className="panel">
            <h2>Reviews</h2>
            {canReview && (
              <form className="review-form" onSubmit={handleReview}>
                <label className="field">
                  Rating
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value} stars
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Comment
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What made this event feel great?"
                    rows={3}
                  />
                </label>
                <button className="primary-button" type="submit">
                  Submit review
                </button>
              </form>
            )}
            {reviews.length === 0 ? (
              <p className="muted">No reviews yet.</p>
            ) : (
              <div className="review-list">
                {reviews.map((review) => (
                  <div key={review.id} className="review-card">
                    <div>
                      <p className="review-rating">{review.rating} / 5</p>
                      <p className="review-comment">{review.comment || "No comment"}</p>
                    </div>
                    <p className="muted">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showProjectsSection && (
            <div className="panel vibe-projects-panel">
              <div className="vibe-projects-accent" aria-hidden />
              <h2 className="vibe-projects-heading">Vibe Coded projects</h2>
              <p className="vibe-projects-subtitle">
                GitHub repos or sites built during this event.
              </p>

              {canAddProject && (
                <form className="vibe-project-form" onSubmit={handleAddProject}>
                  <div className="vibe-project-form-row">
                    <label className="vibe-project-field">
                      <span className="vibe-project-field-label">Link <span className="vibe-project-required">*</span></span>
                      <input
                        type="url"
                        value={projectLink}
                        onChange={(e) => setProjectLink(e.target.value)}
                        placeholder="https://github.com/..."
                        className="vibe-project-input"
                        required
                      />
                    </label>
                  </div>
                  <div className="vibe-project-form-row vibe-project-form-row-optional">
                    <label className="vibe-project-field">
                      <span className="vibe-project-field-label">Title</span>
                      <input
                        type="text"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        placeholder="My cool project"
                        className="vibe-project-input"
                      />
                    </label>
                  </div>
                  <div className="vibe-project-form-row vibe-project-form-row-optional">
                    <label className="vibe-project-field">
                      <span className="vibe-project-field-label">Description</span>
                      <textarea
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        placeholder="What did you build?"
                        rows={2}
                        className="vibe-project-input vibe-project-textarea"
                      />
                    </label>
                  </div>
                  <div className="vibe-project-form-row vibe-project-form-row-optional">
                    <span className="vibe-project-field-label">Tools you used</span>
                    <div className="vibe-tools-preset">
                      {DEFAULT_TOOLS.map((tool) => {
                        const selected = projectTools.includes(tool);
                        return (
                          <button
                            key={tool}
                            type="button"
                            className={`vibe-tool-preset-btn${selected ? " vibe-tool-preset-btn--selected" : ""}`}
                            onClick={() => (selected ? removeProjectTool(tool) : addProjectTool(tool))}
                          >
                            {tool}
                          </button>
                        );
                      })}
                    </div>
                    <div className="vibe-tools-custom">
                      <input
                        type="text"
                        value={customToolInput}
                        onChange={(e) => setCustomToolInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addProjectTool(customToolInput);
                            setCustomToolInput("");
                          }
                        }}
                        placeholder="Add another tool..."
                        className="vibe-project-input vibe-tools-custom-input"
                        aria-label="Add custom tool"
                      />
                      <button
                        type="button"
                        className="vibe-tool-add-custom"
                        onClick={() => {
                          addProjectTool(customToolInput);
                          setCustomToolInput("");
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {projectTools.length > 0 && (
                      <div className="vibe-tools-selected">
                        {projectTools.map((tool) => (
                          <span key={tool} className="vibe-tool-selected-tag">
                            {tool}
                            <button
                              type="button"
                              className="vibe-tool-selected-remove"
                              onClick={() => removeProjectTool(tool)}
                              aria-label={`Remove ${tool}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" className="vibe-project-submit">
                    Add project
                  </button>
                </form>
              )}
              {projects.length === 0 ? (
                canAddProject ? null : (
                  <p className="vibe-projects-empty">
                    No projects shared yet. Check in to add yours.
                  </p>
                )
              ) : (
                <ul className="vibe-project-list" aria-label="Projects from this event">
                  {projects.map((project) => (
                    <li key={project.id} className="vibe-project-card">
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vibe-project-link"
                      >
                        <span className="vibe-project-link-icon" aria-hidden>↗</span>
                        {project.title || project.link}
                      </a>
                      {project.description && (
                        <p className="vibe-project-description">{project.description}</p>
                      )}
                      {project.tools_used && project.tools_used.length > 0 && (
                        <p className="vibe-project-tools">
                          {project.tools_used.map((tool) => (
                            <span key={tool} className="vibe-project-tool-tag">
                              {tool}
                            </span>
                          ))}
                        </p>
                      )}
                      <p className="vibe-project-meta">
                        {profile && project.user_id === profile.id ? (
                          <Link to="/profile" className="vibe-project-author-link">
                            {project.display_name || "Anonymous"}
                          </Link>
                        ) : (
                          <span>{project.display_name || "Anonymous"}</span>
                        )}
                        <span className="vibe-project-meta-sep"> · </span>
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
