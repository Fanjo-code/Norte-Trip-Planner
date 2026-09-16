import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, View, Text, Pressable } from 'react-native';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Activity } from '@/types/trip';
import { mapsUrl, validCoords } from '@/lib/places';

export function RouteMap({
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
        points.forEach((p, i) => {
          const number = document.createElement('span');
          number.textContent = String(i + 1);
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
          label.textContent = `${i + 1}. ${p.title}`;
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
          L.polyline(coords, { color: '#566344', weight: 2, dashArray: '5 7' }).addTo(map);
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
        'aria-label': 'Interactive map of your day',
        style: { width: '100%', height, position: 'relative', zIndex: 0 },
      })}
      {error && (
        <Text accessibilityRole="alert" style={{ padding: 14, color: '#4B5A3B' }}>
          Some map details are unavailable. Open walking directions below.
        </Text>
      )}
      <View
        style={{
          padding: 14,
          gap: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 10, color: '#6A735F' }}>
          Numbered stops · Lines show visit order
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(mapsUrl(points))}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#4B5A3B' }}>
            Open walking directions ↗
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
