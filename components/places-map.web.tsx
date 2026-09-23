import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Activity } from '@/types/trip';
import { validCoords } from '@/lib/places';

export function PlacesMap({
  activities,
  height = 320,
}: {
  activities: Activity[];
  accent: string;
  height?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const points = useMemo(
    () => activities.filter(validCoords).map((a) => ({ lat: a.lat!, lng: a.lng!, title: a.title })),
    [activities],
  );
  useEffect(() => {
    if (!host.current || !points.length) return;
    let active = true;
    let map: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    setError(false);
    void import('leaflet')
      .then((L) => {
        if (!active || !host.current) return;
        map = L.map(host.current, {
          scrollWheelZoom: false,
          zoomAnimation: false,
          fadeAnimation: false,
        });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
          maxZoom: 19,
          referrerPolicy: 'strict-origin-when-cross-origin',
        })
          .on('tileerror', () => {
            if (active) setError(true);
          })
          .addTo(map);
        const coords: [number, number][] = points.map((p) => [p.lat, p.lng]);
        points.forEach((p) => {
          const number = document.createElement('span');
          number.textContent = '?';
          Object.assign(number.style, {
            display: 'grid',
            placeItems: 'center',
            width: '28px',
            height: '28px',
            background: '#566344',
            color: '#fff',
            border: '3px solid white',
            borderRadius: '50%',
            font: '600 12px system-ui',
            boxShadow: '0 2px 8px #0002',
          });
          const label = document.createElement('span');
          label.textContent = p.title;
          L.marker([p.lat, p.lng], {
            title: p.title,
            icon: L.divIcon({
              className: 'norte-map-stop',
              html: number,
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            }),
          })
            .addTo(map!)
            .bindPopup(label);
        });
        if (coords.length > 1) {
          map.fitBounds(coords, { padding: [40, 40], maxZoom: 15 });
        } else map.setView(coords[0], 15);
        observer = new ResizeObserver(() => map?.invalidateSize());
        observer.observe(host.current);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      observer?.disconnect();
      map?.remove();
    };
  }, [points]);
  if (!points.length) return null;
  return (
    <View
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#DEE2D5',
        backgroundColor: '#EEF0E8',
      }}
    >
      {createElement('div', {
        ref: host,
        role: 'region',
        'aria-label': 'Interactive map of city places',
        style: { width: '100%', height, position: 'relative', zIndex: 0 },
      })}
      {error && (
        <Text accessibilityRole="alert" style={{ padding: 14, color: '#4B5A3B' }}>
          Some map details are temporarily unavailable.
        </Text>
      )}
    </View>
  );
}
