import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Event, Review, RSVP } from "../lib/types";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });

export default function EventDetailPage() {
  const { eventId } = useParams();
  const { isAuthed } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvp, setRsvp] = useState<RSVP | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);

    try {
      const [eventData, reviewsData] = await Promise.all([
        apiFetch<Event>(`/events/${eventId}`),
        apiFetch<Review[]>(`/events/${eventId}/reviews`),
      ]);
      setEvent(eventData);
      setReviews(reviewsData);

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

  const handleReview = async (event: FormEvent) => {
    event.preventDefault();
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
          {!isAuthed ? (
            <p className="muted">Sign in to RSVP or review.</p>
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
                  Check in now
                </button>
              )}
            </>
          ) : (
            <button className="primary-button" onClick={handleRsvp}>
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
          <div className="panel">
            <h2>Details</h2>
            <div className="detail-grid">
              <div>
                <p className="label">Format</p>
                <p>
                  {event.location_type === "in_person"
                    ? "In person"
                    : event.location_type === "online"
                    ? "Online"
                    : "Hybrid"}
                </p>
              </div>
              <div>
                <p className="label">Location</p>
                <p>{event.location_name || event.address || event.meeting_url || "TBA"}</p>
              </div>
              <div>
                <p className="label">Capacity</p>
                <p>
                  {event.going_count}/{event.capacity} going
                </p>
              </div>
              <div>
                <p className="label">Waitlist</p>
                <p>{event.waitlist_count} waiting</p>
              </div>
            </div>
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
        </div>

        <aside className="event-side">
          <div className="panel">
            <h3>Organizer</h3>
            <p>{event.organizer_id}</p>
            <p className="muted">Organizer details can be expanded later.</p>
          </div>
          <div className="panel">
            <h3>Capacity status</h3>
            <p className={isFull ? "status full" : "status"}>
              {isFull ? "Full - waitlist open" : "Spots available"}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
