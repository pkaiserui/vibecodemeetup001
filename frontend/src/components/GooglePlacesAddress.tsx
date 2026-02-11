import { useEffect, useRef, useState } from "react";
import { getConfig } from "../lib/googlePlaces";

type GooglePlacesAddressProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: string, zipCode: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/** Place from gmpx-place-picker (value after gmpx-placechange). Supports both legacy and new Places API shapes. */
type PlaceValue = {
  formattedAddress?: string;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    longName?: string;
    shortName?: string;
    long_name?: string;
    short_name?: string;
    types?: string[];
  }>;
  fetchFields?: (opts: { fields: string[] }) => Promise<{ place: PlaceValue }>;
  [key: string]: unknown;
};

function getPostalCodeFromComponents(place: PlaceValue): string | null {
  const components = place?.addressComponents ?? [];
  const postal = components.find((c) => c.types?.includes("postal_code"));
  if (!postal) return null;
  const c = postal as {
    longText?: string;
    shortText?: string;
    longName?: string;
    shortName?: string;
    long_name?: string;
    short_name?: string;
  };
  return c.longText ?? c.shortText ?? c.longName ?? c.long_name ?? c.shortName ?? c.short_name ?? null;
}

/** Normalize to 5-digit US ZIP (strip ZIP+4 extension if present). */
function toFiveDigitZip(value: string | null): string | null {
  if (value == null || value === "") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 5) return digits.slice(0, 5);
  return value.trim() || null;
}

/** Extract 5-digit ZIP from formatted address as fallback (e.g. "..., San Francisco, CA 94105, USA"). */
function getPostalCodeFromFormattedAddress(formattedAddress: string): string | null {
  const match = formattedAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1]! : null;
}

function getPostalCode(place: PlaceValue): string | null {
  let zip = getPostalCodeFromComponents(place);
  if (zip == null && place?.formattedAddress) {
    zip = getPostalCodeFromFormattedAddress(place.formattedAddress);
  }
  return toFiveDigitZip(zip);
}

export default function GooglePlacesAddress({
  id,
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address…",
  className = "",
  disabled = false,
}: GooglePlacesAddressProps) {
  const pickerRef = useRef<HTMLElement | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((config) => {
        if (cancelled) return;
        if (config.googlePlacesApiKey) {
          setApiKey(config.googlePlacesApiKey);
        } else {
          setError("Google Places not configured");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load config");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker || !apiKey) return;
    const handleChange = async () => {
      const place = (picker as unknown as { value?: PlaceValue }).value;
      if (!place?.formattedAddress) return;
      let zip = getPostalCode(place);
      if (zip == null && place.fetchFields && !place.addressComponents?.length) {
        try {
          const { place: fullPlace } = await place.fetchFields({ fields: ["addressComponents"] });
          zip = getPostalCode(fullPlace);
        } catch {
          // ignore; fallback to formatted address below
        }
      }
      onChange(place.formattedAddress);
      onSelect?.(place.formattedAddress, zip ?? null);
    };
    picker.addEventListener("gmpx-placechange", handleChange);
    return () => picker.removeEventListener("gmpx-placechange", handleChange);
  }, [apiKey, onChange, onSelect]);

  if (error) {
    return (
      <input
        id={id}
        type="text"
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={false}
      />
    );
  }

  if (!apiKey) {
    return (
      <div className="address-autocomplete">
        <input
          id={id}
          type="text"
          className={className}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Loading…"
          disabled={disabled}
          aria-label="Address"
          readOnly
        />
      </div>
    );
  }

  return (
    <div className="address-autocomplete address-autocomplete--ecl">
      <gmpx-api-loader
        apiKey={apiKey ?? undefined}
        solution-channel="GMP_GE_placepicker_v2"
      />
      <gmpx-place-picker
        ref={(el) => {
          pickerRef.current = el as HTMLElement | null;
        }}
        id={id}
        placeholder={placeholder}
        type="address"
        style={{ display: "block" }}
      />
    </div>
  );
}
