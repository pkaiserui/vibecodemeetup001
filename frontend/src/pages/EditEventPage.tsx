import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import EventCreatePreview from "../components/EventCreatePreview";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Event } from "../lib/types";

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function EditEventPage() {
  const { eventId } = useParams();
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState<
    "in_person" | "online" | "hybrid"
  >("in_person");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await apiFetch<Event>(`/events/${eventId}`);
      setEvent(data);
      setTitle(data.title);
      setDescription(data.description);
      setLocationType(data.location_type);
      setLocationName(data.location_name ?? "");
      setAddress(data.address ?? "");
      setZipCode(data.zip_code ?? "");
      setMeetingUrl(data.meeting_url ?? "");
      setStartsAt(toDatetimeLocal(data.starts_at));
      setEndsAt(toDatetimeLocal(data.ends_at));
      setCapacity(data.capacity);
    } catch (err) {
      setFetchError((err as Error).message);
    }
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setLoading(true);
    setError(null);

    try {
      await apiFetch<Event>(`/events/${eventId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description,
          location_type: locationType,
          location_name: locationName || null,
          address: address || null,
          zip_code: zipCode.trim() || null,
          meeting_url: meetingUrl || null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          capacity,
        }),
      });
      navigate(`/events/${eventId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page create-page">
        <div className="panel create-panel">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page create-page">
        <div className="panel create-panel create-signin-prompt">
          <h1 className="create-signin-title">Sign in to edit events</h1>
          <Link to="/auth" className="btn-primary create-signin-cta">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (fetchError || (event && event.organizer_id !== profile.id)) {
    return (
      <div className="page create-page">
        <div className="panel create-panel">
          <h1>Cannot edit this event</h1>
          <p className="muted">
            {fetchError ?? "Only the host can edit this event."}
          </p>
          <Link to={eventId ? `/events/${eventId}` : "/"} className="btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
            Back to event
          </Link>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page create-page">
        <div className="panel create-panel">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading event...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page create-page">
      <div className="create-layout">
        <main className="create-form-column">
          <header className="create-header">
            <h1 className="create-title">Edit event</h1>
            <p className="create-subtitle">
              Update your event details.
            </p>
          </header>

          <form className="create-form" onSubmit={handleSubmit}>
            <div className="create-form-group">
              <label className="create-label" htmlFor="title">
                Event title <span className="create-required">*</span>
              </label>
              <input
                id="title"
                className="create-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Vibe Coding Night: Build Something Cool"
                required
              />
            </div>

            <div className="create-form-group">
              <label className="create-label" htmlFor="description">
                Description <span className="create-required">*</span>
              </label>
              <textarea
                id="description"
                className="create-input create-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What's the vibe? Tell attendees what to expect..."
                required
              />
            </div>

            <div className="create-form-row">
              <div className="create-form-group">
                <label className="create-label" htmlFor="format">
                  Format
                </label>
                <select
                  id="format"
                  className="create-input create-select"
                  value={locationType}
                  onChange={(e) =>
                    setLocationType(e.target.value as "in_person" | "online" | "hybrid")
                  }
                >
                  <option value="in_person">In person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="create-form-group">
                <label className="create-label" htmlFor="capacity">
                  Capacity
                </label>
                <input
                  id="capacity"
                  className="create-input"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="create-form-group">
              <label className="create-label" htmlFor="locationName">
                Location name
              </label>
              <input
                id="locationName"
                className="create-input"
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Studio Nova, Zoom room, etc."
              />
            </div>

            <div className="create-form-group">
              <label className="create-label" htmlFor="address">
                Address
              </label>
              <input
                id="address"
                className="create-input"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
              />
            </div>

            <div className="create-form-group">
              <label className="create-label" htmlFor="zipCode">
                Zip code (for distance sorting)
              </label>
              <input
                id="zipCode"
                className="create-input"
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="94105"
                maxLength={10}
              />
            </div>

            <div className="create-form-group">
              <label className="create-label" htmlFor="meetingUrl">
                Meeting URL
              </label>
              <input
                id="meetingUrl"
                className="create-input"
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            </div>

            <div className="create-form-row">
              <div className="create-form-group">
                <label className="create-label" htmlFor="startsAt">
                  Starts at <span className="create-required">*</span>
                </label>
                <input
                  id="startsAt"
                  className="create-input"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </div>
              <div className="create-form-group">
                <label className="create-label" htmlFor="endsAt">
                  Ends at <span className="create-required">*</span>
                </label>
                <input
                  id="endsAt"
                  className="create-input"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="error create-error">{error}</p>}

            <div className="create-form-actions">
              <Link to={`/events/${eventId}`} className="ghost-button">
                Cancel
              </Link>
              <button
                className="primary-button create-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>

          <div className="create-preview-below">
            <EventCreatePreview
              title={title}
              description={description}
              locationType={locationType}
              locationName={locationName}
              address={address}
              meetingUrl={meetingUrl}
              startsAt={startsAt}
              endsAt={endsAt}
              capacity={capacity}
              organizerName={profile.display_name}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
