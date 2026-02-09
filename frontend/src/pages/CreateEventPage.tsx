import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Event } from "../lib/types";

export default function CreateEventPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState<"in_person" | "online" | "hybrid">("in_person");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canHost = profile?.role === "organizer" || profile?.role === "admin";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title,
        description,
        location_type: locationType,
        location_name: locationName || null,
        address: address || null,
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

  if (!canHost) {
    return (
      <div className="page">
        <div className="panel">
          <h1>Hosting access required</h1>
          <p className="muted">
            You need the organizer role to create events. Ask an admin to upgrade your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Host a new event</h1>
      <p className="page-subtitle">
        Set the vibe, define the capacity, and share the essentials.
      </p>

      <form className="panel form" onSubmit={handleSubmit}>
        <label className="field">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="field">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />
        </label>
        <div className="field-row">
          <label className="field">
            Format
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as "in_person" | "online" | "hybrid")}
            >
              <option value="in_person">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <label className="field">
            Capacity
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              required
            />
          </label>
        </div>
        <label className="field">
          Location name
          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Studio Nova, Zoom room, etc."
          />
        </label>
        <label className="field">
          Address (optional)
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label className="field">
          Meeting URL (optional)
          <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            Starts at
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Ends at
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create event"}
        </button>
      </form>
    </div>
  );
}
