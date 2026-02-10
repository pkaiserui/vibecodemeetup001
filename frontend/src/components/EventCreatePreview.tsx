type PreviewProps = {
  title: string;
  description: string;
  locationType: "in_person" | "online" | "hybrid";
  locationName: string;
  address: string;
  meetingUrl: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  organizerName: string;
};

const formatPreviewDate = (value: string) => {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
};

const getLocationIcon = (type: string) => {
  switch (type) {
    case "in_person":
      return "📍";
    case "online":
      return "💻";
    case "hybrid":
      return "🔗";
    default:
      return "📍";
  }
};

const getLocationLabel = (type: string) => {
  switch (type) {
    case "in_person":
      return "In person";
    case "online":
      return "Online";
    case "hybrid":
      return "Hybrid";
    default:
      return "In person";
  }
};

export default function EventCreatePreview({
  title,
  description,
  locationType,
  locationName,
  address,
  meetingUrl,
  startsAt,
  endsAt,
  capacity,
  organizerName,
}: PreviewProps) {
  const displayLocation =
    locationName || address || meetingUrl || "Location TBA";
  const startFormatted = formatPreviewDate(startsAt);
  const endFormatted = formatPreviewDate(endsAt);
  const hasContent =
    title || description || startFormatted || displayLocation || capacity;

  return (
    <div className="event-create-preview">
      <div className="event-create-preview-badge">Live preview</div>

      <div className="event-create-preview-card">
        <div className="event-create-preview-card-inner">
          {/* Header accent bar */}
          <div className="event-create-preview-accent" />

          <div className="event-create-preview-header">
            <div className="event-create-preview-type">
              <span className="event-create-preview-type-icon">
                {getLocationIcon(locationType)}
              </span>
              <span>{getLocationLabel(locationType)}</span>
            </div>
          </div>

          <h3 className="event-create-preview-title">
            {title || "Your event title"}
          </h3>

          {description ? (
            <p className="event-create-preview-description">{description}</p>
          ) : (
            <p className="event-create-preview-placeholder">
              Add a description to show attendees what to expect...
            </p>
          )}

          <div className="event-create-preview-details">
            {startFormatted && (
              <div className="event-create-preview-detail">
                <span className="event-create-preview-detail-icon">📅</span>
                <span>
                  {startFormatted}
                  {endFormatted && endFormatted !== startFormatted && (
                    <span className="event-create-preview-time-end">
                      {" "}
                      → {endFormatted}
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="event-create-preview-detail">
              <span className="event-create-preview-detail-icon">📍</span>
              <span>{displayLocation}</span>
            </div>

            {capacity > 0 && (
              <div className="event-create-preview-detail">
                <span className="event-create-preview-detail-icon">👥</span>
                <span>
                  {capacity} {capacity === 1 ? "spot" : "spots"}
                </span>
              </div>
            )}
          </div>

          {(organizerName || hasContent) && (
            <div className="event-create-preview-footer">
              <span className="event-create-preview-host">
                Hosted by {organizerName || "you"}
              </span>
            </div>
          )}
        </div>
      </div>

      {!hasContent && (
        <p className="event-create-preview-hint">
          Fill in the form to see your invite come to life
        </p>
      )}
    </div>
  );
}
