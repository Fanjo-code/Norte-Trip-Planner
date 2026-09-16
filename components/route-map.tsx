import { useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Activity } from '@/types/trip';
import { validCoords, mapsUrl } from '@/lib/places';
import { useTheme } from '@/hooks/use-theme';
export function RouteMap({
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
        edgePadding: { top: 45, left: 45, right: 45, bottom: 45 },
        animated: true,
      });
  }, [coords]);
  if (!points.length) return null;
  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: t.card }}>
      <MapView
        ref={ref}
        style={{ height }}
        onMapReady={() =>
          ref.current?.fitToCoordinates(coords, {
            edgePadding: { top: 45, left: 45, right: 45, bottom: 45 },
            animated: false,
          })
        }
        initialRegion={{ ...coords[0], latitudeDelta: 0.03, longitudeDelta: 0.03 }}
      >
        {points.map((p, i) => (
          <Marker key={p.id} coordinate={coords[i]} title={p.title}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: accent,
                borderWidth: 2,
                borderColor: '#FFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: t.badgeText, fontWeight: '700' }}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
        {coords.length > 1 && (
          <Polyline
            coordinates={coords}
            strokeColor={accent}
            strokeWidth={2}
            lineDashPattern={[5, 7]}
          />
        )}
      </MapView>
      <Pressable onPress={() => Linking.openURL(mapsUrl(points))} style={{ padding: 16 }}>
        <Text style={{ color: t.accent, fontSize: 12 }}>
          Visit order · Open walking directions ↗
        </Text>
      </Pressable>
    </View>
  );
}
