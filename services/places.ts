/**
 * Location suggestions: Google Places when available, OpenStreetMap Nominatim as fallback.
 * Nominatim works without billing; enable billing on your Google Cloud project for Google results.
 */

export type PlaceSuggestion = {
  place_id: string;
  description: string;
  lat?: number;
  lng?: number;
  source: "google" | "nominatim";
};

export type LocationBias = { lat: number; lng: number };

export type PlaceSuggestionsResult = {
  suggestions: PlaceSuggestion[];
  provider: "google" | "nominatim" | "none";
  errorMessage?: string;
};

const GOOGLE_KEY =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) || "";

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "SquareApp/1.0 (contact: support@square.app)",
};

async function fetchGoogleSuggestions(
  text: string,
  bias?: LocationBias | null
): Promise<{ suggestions: PlaceSuggestion[]; errorMessage?: string }> {
  if (!GOOGLE_KEY || !text.trim()) {
    return { suggestions: [], errorMessage: GOOGLE_KEY ? undefined : "Google Maps API key not configured" };
  }

  let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    text
  )}&key=${GOOGLE_KEY}`;

  if (bias) {
    url += `&location=${bias.lat},${bias.lng}&radius=50000`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data?.error_message) {
      console.warn("Google Places API:", data.error_message);
      return { suggestions: [], errorMessage: data.error_message as string };
    }
    const suggestions = (data?.predictions || []).map(
      (p: { place_id: string; description: string }) => ({
        place_id: p.place_id,
        description: p.description,
        source: "google" as const,
      })
    );
    return { suggestions };
  } catch (e) {
    console.warn("Google Places fetch failed", e);
    return { suggestions: [], errorMessage: "Could not reach Google Places" };
  }
}

async function fetchNominatimSuggestions(
  text: string,
  bias?: LocationBias | null
): Promise<PlaceSuggestion[]> {
  if (!text.trim()) return [];

  let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    text
  )}&format=json&limit=6&addressdetails=0`;

  if (bias) {
    const d = 0.45;
    const left = bias.lng - d;
    const right = bias.lng + d;
    const top = bias.lat + d;
    const bottom = bias.lat - d;
    url += `&viewbox=${left},${top},${right},${bottom}&bounded=1`;
  }

  try {
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
    }>;
    return data.map((item) => ({
      place_id: `nominatim:${item.place_id}`,
      description: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      source: "nominatim" as const,
    }));
  } catch (e) {
    console.warn("Nominatim fetch failed", e);
    return [];
  }
}

/** Search addresses/places; falls back to OpenStreetMap when Google returns nothing or billing fails. */
export async function fetchPlaceSuggestions(
  text: string,
  bias?: LocationBias | null
): Promise<PlaceSuggestionsResult> {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    return { suggestions: [], provider: "none" };
  }

  const google = await fetchGoogleSuggestions(trimmed, bias);
  if (google.suggestions.length > 0) {
    return { suggestions: google.suggestions, provider: "google" };
  }

  const nominatim = await fetchNominatimSuggestions(trimmed, bias);
  if (nominatim.length > 0) {
    return { suggestions: nominatim, provider: "nominatim" };
  }

  const billingHint =
    google.errorMessage?.includes("Billing") || google.errorMessage?.includes("billing")
      ? " Google Places needs billing enabled on your Cloud project; showing OpenStreetMap results when available."
      : "";

  return {
    suggestions: [],
    provider: "none",
    errorMessage:
      (google.errorMessage
        ? `${google.errorMessage}${billingHint}`
        : "No locations found. Try a more specific address.") || undefined,
  };
}

/** Resolve coordinates for a selected suggestion. */
export async function resolvePlaceCoordinates(
  suggestion: PlaceSuggestion
): Promise<{ lat: number; lng: number } | null> {
  if (
    suggestion.source === "nominatim" &&
    typeof suggestion.lat === "number" &&
    typeof suggestion.lng === "number"
  ) {
    return { lat: suggestion.lat, lng: suggestion.lng };
  }

  if (!GOOGLE_KEY || !suggestion.place_id) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      suggestion.place_id
    )}&fields=geometry&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.error_message) {
      console.warn("Google Place Details:", data.error_message);
      return null;
    }
    const loc = data?.result?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}
