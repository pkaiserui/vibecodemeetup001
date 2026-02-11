/**
 * Load Google Maps JavaScript API with Places library.
 * Key is fetched from backend GET /config (googlePlacesApiKey).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type Config = { googlePlacesApiKey: string | null };

let configPromise: Promise<Config> | null = null;

export async function getConfig(): Promise<Config> {
  if (!configPromise) {
    configPromise = fetch(`${API_BASE}/config`)
      .then((r) => r.json() as Promise<Config>)
      .catch(() => ({ googlePlacesApiKey: null }));
  }
  return configPromise;
}

declare global {
  interface Window {
    __googleMapsCallback?: () => void;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

/**
 * Load the Google Maps script with Places library. Resolves when ready.
 * Call only when apiKey is non-empty.
 */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined" || (window as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps?.places) {
    return Promise.resolve();
  }
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const callbackName = "__googleMapsCallback";
    window[callbackName] = () => {
      if (window[callbackName]) delete window[callbackName];
      resolve();
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}
