import { useEffect, useRef, useMemo } from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import type { Activity } from '@/types/trip';
import { validCoords } from '@/lib/places';
import { useTheme } from '@/hooks/use-theme';

export function PlacesMap({
  activities,
  accent,
  height = 320,
}: {
  activities: Activity[];
  accent: string;
  height?: number;
}) {
  const t = useTheme();
  const ref = useRef<MapView>(null);
  const points = useMemo(() => activities.filter(validCoords), [activities]);
  const coords = useMemo(
    () => points.map((p) => ({ latitude: p.lat!, longitude: p.lng! })),
    [points],
  );
  useEffect(() => {
    if (coords.length)
      ref.current?.fitToCoordinates(coords, {
        edgePadding: { top: 50, left: 50, right: 50, bottom: 50 },
        animated: true,
      });
  }, [coords]);
  if (!points.length) return null;
  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: t.card, height }}>
      <MapView
        ref={ref}
        style={{ height }}
        onMapReady={() =>
          ref.current?.fitToCoordinates(coords, {
            edgePadding: { top: 50, left: 50, right: 50, bottom: 50 },
            animated: false,
          })
        }
        initialRegion={{ ...coords[0], latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {points.map((p, i) => (
          <Marker key={p.id} coordinate={coords[i]} title={p.title}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: accent,
                borderWidth: 3,
                borderColor: '#FFF',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
              }}
            >
              <Ionicons name={p.icon} size={14} color="#FFF" />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
