import { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/** Format Date to datetime-local value (YYYY-MM-DDTHH:mm) */
export function toDatetimeLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

type DateTimePickerFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  /** Min date (datetime-local string or null); dates before this are disabled. Used e.g. for "Ends at" when "Starts at" is set. */
  minDate?: string | null;
  /** Min datetime (datetime-local string or null); selected datetime must be after this. Used for "Ends at" so end time is after start time. */
  minDateTime?: string | null;
};

export default function DateTimePickerField({
  id,
  label,
  value,
  onChange,
  required = false,
  placeholder = "Pick date & time",
  minDate: minDateProp = null,
  minDateTime: minDateTimeProp = null,
}: DateTimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"date" | "time">("date");
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [timeHour, setTimeHour] = useState<number>(12);
  const [timeMinute, setTimeMinute] = useState<0 | 15 | 30 | 45>(0);
  const [timeAmPm, setTimeAmPm] = useState<"AM" | "PM">("PM");
  const overlayRef = useRef<HTMLDivElement>(null);

  const dateValue = value ? new Date(value) : null;
  const displayDate = dateValue
    ? dateValue.toLocaleDateString(undefined, { dateStyle: "medium" })
    : "";
  const displayTime = dateValue
    ? dateValue.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const displayText = value ? `${displayDate}, ${displayTime}` : placeholder;

  const handleOpen = () => {
    setOpen(true);
    setStep("date");
    setTempDate(dateValue || null);
  };

  const handleDateSelect = (d: Date | null) => {
    if (!d) return;
    setTempDate(d);
    const existing = dateValue && value ? new Date(value) : null;
    if (existing) {
      const h = existing.getHours();
      const m = existing.getMinutes();
      const hour12 = h % 12 || 12;
      setTimeHour(hour12);
      setTimeMinute(([0, 15, 30, 45].includes(m) ? m : 0) as 0 | 15 | 30 | 45);
      setTimeAmPm(h < 12 ? "AM" : "PM");
    } else {
      setTimeHour(12);
      setTimeMinute(0);
      setTimeAmPm("PM");
    }
    setStep("time");
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    if (!tempDate) return;
    const combined = new Date(
      tempDate.getFullYear(),
      tempDate.getMonth(),
      tempDate.getDate(),
      hours,
      minutes,
      0,
      0
    );
    onChange(toDatetimeLocal(combined));
    setOpen(false);
    setStep("date");
    setTempDate(null);
  };

  const handleBack = () => {
    setStep("date");
  };

  const handleClose = () => {
    setOpen(false);
    setStep("date");
    setTempDate(null);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  /** 12h + AM/PM → 24h */
  const to24h = (hour12: number, amPm: "AM" | "PM") => {
    if (amPm === "AM") return hour12 === 12 ? 0 : hour12;
    return hour12 === 12 ? 12 : hour12 + 12;
  };

  const proposedEnd =
    tempDate &&
    new Date(
      tempDate.getFullYear(),
      tempDate.getMonth(),
      tempDate.getDate(),
      to24h(timeHour, timeAmPm),
      timeMinute,
      0,
      0
    );
  const minDateTimeDate = minDateTimeProp
    ? (() => {
        const d = new Date(minDateTimeProp);
        return isNaN(d.getTime()) ? null : d;
      })()
    : null;
  const isEndBeforeStart =
    minDateTimeDate != null && proposedEnd != null && proposedEnd.getTime() <= minDateTimeDate.getTime();

  const handleSetTime = () => {
    if (isEndBeforeStart) return;
    handleTimeSelect(to24h(timeHour, timeAmPm), timeMinute);
  };

  const hours12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes: (0 | 15 | 30 | 45)[] = [0, 15, 30, 45];

  const minDate = minDateProp
    ? (() => {
        const d = new Date(minDateProp);
        if (isNaN(d.getTime())) return undefined;
        d.setHours(0, 0, 0, 0);
        return d;
      })()
    : undefined;

  return (
    <div className="create-form-group create-form-group-datetime">
      <label className="create-label" htmlFor={id}>
        {label} {required && <span className="create-required">*</span>}
      </label>
      <div className="create-datetime-trigger-wrap">
        <button
          id={id}
          type="button"
          className="create-input create-input-datetime create-datetime-trigger"
          onClick={handleOpen}
          aria-label={value ? `${label}: ${displayText}` : `${label}: ${placeholder}`}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="create-datetime-trigger-icon" aria-hidden>
            📅
          </span>
          <span className="create-datetime-trigger-text">{displayText}</span>
        </button>

        {open && (
          <div
            ref={overlayRef}
            className="create-datetime-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={step === "date" ? "Choose date" : "Choose time"}
            onClick={(e) => {
              if (e.target === overlayRef.current) handleClose();
            }}
          >
            <div
              className="create-datetime-overlay-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="create-datetime-overlay-header">
                <span className="create-datetime-overlay-title">
                  {step === "date" ? "Choose date" : "Choose time"}
                </span>
                <div className="create-datetime-overlay-actions">
                  {step === "time" && (
                    <button
                      type="button"
                      className="create-datetime-overlay-back"
                      onClick={handleBack}
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    type="button"
                    className="create-datetime-overlay-close"
                    onClick={handleClose}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              {step === "date" && (
                <div className="create-datetime-step create-datetime-step-date">
                  <DatePicker
                    inline
                    selected={tempDate || dateValue}
                    onChange={handleDateSelect}
                    showTimeSelect={false}
                    minDate={minDate}
                    calendarClassName="create-datetime-calendar create-datetime-calendar-small"
                    dateFormat="MMM d, yyyy"
                  />
                </div>
              )}

              {step === "time" && tempDate && (
                <div className="create-datetime-step create-datetime-step-time">
                  <p className="create-datetime-step-date-label">
                    {tempDate.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <div className="create-datetime-wheel-row" role="group" aria-label="Set time">
                    <div className="create-datetime-wheel-col" aria-label="Hour">
                      <div className="create-datetime-wheel-label">Hour</div>
                      <div className="create-datetime-wheel-options">
                        {hours12.map((h) => (
                          <button
                            key={h}
                            type="button"
                            className={`create-datetime-wheel-opt ${timeHour === h ? "create-datetime-wheel-opt--selected" : ""}`}
                            onClick={() => setTimeHour(h)}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="create-datetime-wheel-col" aria-label="Minute">
                      <div className="create-datetime-wheel-label">Min</div>
                      <div className="create-datetime-wheel-options">
                        {minutes.map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`create-datetime-wheel-opt ${timeMinute === m ? "create-datetime-wheel-opt--selected" : ""}`}
                            onClick={() => setTimeMinute(m)}
                          >
                            {String(m).padStart(2, "0")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="create-datetime-wheel-col" aria-label="AM/PM">
                      <div className="create-datetime-wheel-label">AM/PM</div>
                      <div className="create-datetime-wheel-options">
                        {(["AM", "PM"] as const).map((ap) => (
                          <button
                            key={ap}
                            type="button"
                            className={`create-datetime-wheel-opt create-datetime-wheel-opt--ampm ${timeAmPm === ap ? "create-datetime-wheel-opt--selected" : ""}`}
                            onClick={() => setTimeAmPm(ap)}
                          >
                            {ap}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isEndBeforeStart && (
                    <p className="create-datetime-time-error" role="alert">
                      End time must be after start time
                    </p>
                  )}
                  <button
                    type="button"
                    className="create-datetime-set-btn"
                    onClick={handleSetTime}
                    disabled={isEndBeforeStart}
                  >
                    Set time
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
