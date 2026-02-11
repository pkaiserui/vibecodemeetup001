import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import GooglePlacesAddress from "../components/GooglePlacesAddress";
import DateTimePickerField from "../components/DateTimePickerField";
import EventCreatePreview from "../components/EventCreatePreview";
import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Event } from "../lib/types";

export default function CreateEventPage() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!startsAt || !endsAt) {
      setError("Please set both start and end date & time.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload = {
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
      };

      const data = await apiFetch<Event>("/events", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      navigate(`/events/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page create-page">
        <div className="panel create-panel create-loading-panel">
          <div className="create-accent create-signin-accent" aria-hidden />
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page create-page">
        <div className="panel create-panel create-signin-prompt">
          <div className="create-accent create-signin-accent" aria-hidden />
          <h1 className="create-signin-title">Sign in to host an event</h1>
          <p className="create-signin-subtitle">
            Create an account or sign in to host your own vibe coding meetup.
          </p>
          <Link
            to="/auth"
            className="btn-primary create-signin-cta"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page create-page">
      <div className="create-layout">
        <main className="create-form-column" aria-label="Event details form">
          <div className="create-header-wrap">
            <div className="create-accent" aria-hidden />
            <header className="create-header">
              <h1 className="create-title">Create your event</h1>
              <p className="create-subtitle">
                Set the vibe, define the capacity, and see your invite take shape.
              </p>
            </header>
          </div>

          <form className="create-form create-form-panel" onSubmit={handleSubmit}>
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
              <GooglePlacesAddress
                id="address"
                className="create-input"
                value={address}
                onChange={setAddress}
                onSelect={(_addr, zip) => {
                  if (zip) setZipCode(zip);
                }}
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

            <div className="create-form-row create-form-row-datetime">
              <DateTimePickerField
                id="startsAt"
                label="Starts at"
                value={startsAt}
                onChange={setStartsAt}
                required
                placeholder="Pick date & time"
              />
              <DateTimePickerField
                id="endsAt"
                label="Ends at"
                value={endsAt}
                onChange={setEndsAt}
                required
                placeholder="Pick date & time"
                minDate={startsAt || null}
                minDateTime={startsAt || null}
              />
            </div>

            {error && <p className="error create-error" role="alert">{error}</p>}

            <button
              className="create-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating…" : "Create event"}
            </button>
          </form>

          <section className="create-preview-below" aria-label="Live preview">
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
          </section>
        </main>
      </div>
    </div>
  );
}
