import { env } from '@/lib/env';
import type { GoogleCandidate } from '@/lib/domain/google-match';

/**
 * Google Maps Platform, Places API (New). Two calls: a name search to find
 * a venue's place once, and the place's rating and reviews, fetched live
 * for a visitor and never stored (Google's terms allow keeping only the
 * place ID). Server only: the key never reaches a browser.
 */
const BASE = 'https://places.googleapis.com/v1';
const headers = (fields: string) => ({ 'content-type': 'application/json', 'x-goog-api-key': env.GOOGLE_MAPS_API_KEY ?? '', 'x-goog-fieldmask': fields });

export const googleConfigured = () => !!env.GOOGLE_MAPS_API_KEY;

type Found = { places?: { id: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number } }[] };

/** Up to five places for a name, nearest our pin when we have one. */
export async function searchPlaces(query: string, near: { lat: number; lon: number } | null): Promise<GoogleCandidate[]> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: headers('places.id,places.displayName,places.formattedAddress,places.location'),
    body: JSON.stringify({
      textQuery: query,
      regionCode: 'GB',
      pageSize: 5,
      ...(near ? { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lon }, radius: 1000 } } } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Google search said ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as Found;
  return (body.places ?? []).map((p) => ({
    id: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
    lat: p.location?.latitude ?? null,
    lon: p.location?.longitude ?? null,
  }));
}

export type GoogleReview = { author: string; authorUrl: string | null; authorPhoto: string | null; rating: number; when: string; text: string; url: string | null };
export type GoogleReviews = { rating: number | null; count: number; mapsUrl: string | null; reviews: GoogleReview[] };

type Details = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: { rating?: number; relativePublishTimeDescription?: string; text?: { text?: string }; originalText?: { text?: string }; googleMapsUri?: string; authorAttribution?: { displayName?: string; uri?: string; photoUri?: string } }[];
};

/** A place's rating, how many have rated it, and up to five reviews, in English where Google has it. */
export async function placeReviews(placeId: string): Promise<GoogleReviews> {
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers: headers('rating,userRatingCount,googleMapsUri,reviews'),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Google details said ${res.status}`);
  const d = (await res.json()) as Details;
  return {
    rating: d.rating ?? null,
    count: d.userRatingCount ?? 0,
    mapsUrl: d.googleMapsUri ?? null,
    reviews: (d.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? 'A Google user',
        authorUrl: r.authorAttribution?.uri ?? null,
        authorPhoto: r.authorAttribution?.photoUri ?? null,
        rating: r.rating ?? 0,
        when: r.relativePublishTimeDescription ?? '',
        text: r.text?.text ?? r.originalText?.text ?? '',
        url: r.googleMapsUri ?? null,
      }))
      .filter((r) => r.text),
  };
}
