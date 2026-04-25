// Loads the Google Maps JS API once and caches the promise.
// Includes the "places" library for Autocomplete.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loaderPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (loaderPromise) return loaderPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"));
  }

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-maps-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}
