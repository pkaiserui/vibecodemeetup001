import { useState, useRef, useEffect, useCallback } from "react";
import { searchUSZipcodes, type USZipEntry } from "../lib/usZipcodes";

const PHOTON_API = "https://photon.komoot.io/api/";

export type PhotonFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    district?: string;
    [key: string]: unknown;
  };
};

/** Result item: either Photon (full address) or US city/state/zip from zipcodes package */
export type AddressSuggestion = PhotonFeature | (USZipEntry & { _source: "us-zipcodes" });

function formatPhotonLabel(f: PhotonFeature): string {
  const p = f.properties;
  const parts: string[] = [];
  if (p.housenumber && p.street) parts.push(`${p.housenumber} ${p.street}`);
  else if (p.street) parts.push(p.street);
  else if (p.name) parts.push(p.name);
  if (p.city) parts.push(p.city);
  if (p.state) parts.push(p.state);
  if (p.country) parts.push(p.country);
  return parts.filter(Boolean).join(", ");
}

function formatPhotonValue(f: PhotonFeature): string {
  const p = f.properties;
  const parts: string[] = [];
  if (p.housenumber && p.street) parts.push(`${p.housenumber} ${p.street}`);
  else if (p.street) parts.push(p.street);
  else if (p.name) parts.push(p.name);
  if (p.city) parts.push(p.city);
  if (p.state) parts.push(p.state);
  return parts.filter(Boolean).join(", ");
}

function isPhoton(s: AddressSuggestion): s is PhotonFeature {
  return s && (s as PhotonFeature).type === "Feature";
}

type AddressAutocompleteProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: string, zipCode: string | null, feature?: PhotonFeature | USZipEntry) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** "photon" = online API (global). "us-zipcodes" = offline npm package (USA city/state/zip only). */
  source?: "photon" | "us-zipcodes";
};

const DEBOUNCE_MS = 350;
const PHOTON_LIMIT = 6;
const USZIP_LIMIT = 8;

export default function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address…",
  className = "",
  disabled = false,
  source = "photon",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchPhoton = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query.trim(), limit: String(PHOTON_LIMIT) });
      const res = await fetch(`${PHOTON_API}?${params}`);
      if (!res.ok) throw new Error("Photon API error");
      const data = (await res.json()) as { features: PhotonFeature[] };
      setSuggestions(data.features || []);
      setOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const runSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (source === "us-zipcodes") {
        if (q.length < 1) {
          setSuggestions([]);
          return;
        }
        const entries = searchUSZipcodes(q, USZIP_LIMIT).map((e) => ({ ...e, _source: "us-zipcodes" as const }));
        setSuggestions(entries);
        setOpen(entries.length > 0);
      } else {
        if (q.length < 2) {
          setSuggestions([]);
          return;
        }
        fetchPhoton(q);
      }
    },
    [source, fetchPhoton]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(value), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, runSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: AddressSuggestion) => {
    if (isPhoton(item)) {
      const addressValue = formatPhotonValue(item);
      const zip = item.properties.postcode ?? null;
      onChange(addressValue);
      onSelect?.(addressValue, zip, item);
    } else {
      onChange(item.label);
      onSelect?.(item.label, item.zip, item);
    }
    setSuggestions([]);
    setOpen(false);
  };

  const getLabel = (item: AddressSuggestion) =>
    isPhoton(item) ? formatPhotonLabel(item) : item.label;

  const getKey = (item: AddressSuggestion, i: number) =>
    isPhoton(item)
      ? `${(item as PhotonFeature).properties.osm_id ?? ""}-${(item as PhotonFeature).properties.osm_type ?? ""}-${i}`
      : `zip-${(item as USZipEntry).zip}-${i}`;

  return (
    <div ref={wrapperRef} className="address-autocomplete">
      <input
        id={id}
        type="text"
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={open ? `${id}-listbox` : undefined}
        role="combobox"
        aria-label="Address"
      />
      {loading && (
        <span className="address-autocomplete-spinner" aria-hidden />
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          className="address-autocomplete-list"
          role="listbox"
          aria-label="Address suggestions"
        >
          {suggestions.map((item, i) => (
            <li
              key={getKey(item, i)}
              role="option"
              className="address-autocomplete-item"
              onClick={() => handleSelect(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(item);
                }
              }}
              tabIndex={0}
            >
              {getLabel(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
