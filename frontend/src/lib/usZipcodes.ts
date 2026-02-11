/**
 * Offline US city/state/ZIP autocomplete using the zipcodes package.
 * Data is from federalgovernmentzipcodes.us (USA only when filtered).
 * ~5MB unpacked; no API key or network required.
 */

// @ts-expect-error CommonJS module
import zipcodes from "zipcodes";

type ZipRecord = { zip: string; city: string; state: string; country?: string };
const codes = (zipcodes?.codes ?? {}) as Record<string, ZipRecord>;

export type USZipEntry = {
  zip: string;
  city: string;
  state: string;
  label: string;
};

let entriesCache: USZipEntry[] | null = null;

function getEntries(): USZipEntry[] {
  if (entriesCache) return entriesCache;
  entriesCache = Object.values(codes)
    .filter((c): c is ZipRecord => c != null && c.country === "US")
    .map((c) => ({
      zip: c.zip,
      city: c.city,
      state: c.state,
      label: `${c.city}, ${c.state} ${c.zip}`,
    }));
  return entriesCache;
}

const q = (s: string) => s.toLowerCase().trim();

/**
 * Search US city/state/ZIP by prefix. Returns up to `limit` matches.
 * Matches: city name, state code (e.g. CA), or ZIP prefix.
 */
export function searchUSZipcodes(query: string, limit = 8): USZipEntry[] {
  const qq = q(query);
  if (qq.length < 1) return [];
  const entries = getEntries();
  const out: USZipEntry[] = [];
  for (const e of entries) {
    if (
      q(e.city).startsWith(qq) ||
      q(e.state).startsWith(qq) ||
      e.zip.startsWith(query.trim())
    ) {
      out.push(e);
      if (out.length >= limit) break;
    }
  }
  return out;
}
