'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export type MapPoint = { slug: string; name: string; lat: number; lon: number; included: boolean; eventCount: number };

/** Venues on an OpenStreetMap base. Green: in the guide. Grey: not yet. */
export function VenueMap({ points }: { points: MapPoint[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import('leaflet').Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current) return;
      map = L.map(el.current).setView([49.214, -2.13], 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      for (const p of points) {
        L.circleMarker([p.lat, p.lon], {
          radius: 6 + Math.min(p.eventCount, 6),
          color: p.included ? '#047857' : '#78716c',
          fillOpacity: 0.7,
          weight: 1,
        })
          .bindPopup(`<a href="/venues/${p.slug}"><strong>${escapeHtml(p.name)}</strong></a><br>${p.eventCount} event${p.eventCount === 1 ? '' : 's'}`)
          .addTo(map);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return <div ref={el} className="h-[70vh] w-full rounded border border-stone-200" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
