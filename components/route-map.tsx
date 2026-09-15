import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import type { Activity } from '@/types/trip';

interface RouteMapProps {
  activities: Activity[];
  accent: string;
}

/** Resolves coordinates for an activity: real lat/lng only (no hardcoded fallbacks). */
function resolveCoords(a: Activity): { lat: number; lng: number } | null {
  if (a.lat != null && a.lng != null) return { lat: a.lat, lng: a.lng };
  return null;
}

/** Build Google Maps URL with multiple waypoints */
function buildMapsUrl(resolved: { lat: number; lng: number }[]): string {
  if (resolved.length === 0) return 'https://www.google.com/maps';

  // Build Google Maps directions URL with multiple waypoints
  // Format: https://www.google.com/maps/dir/?api=1&destination=lat,lng&waypoints=lat,lng|lat,lng
  const destination = `${resolved[0].lat},${resolved[0].lng}`;
  const waypoints = resolved.slice(1).map(p => `${p.lat},${p.lng}`).join('|');

  const params = new URLSearchParams({
    api: '1',
    destination,
    ...(waypoints && { waypoints }),
    travelmode: 'walking',
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Simple numbered route map — connects dots in order, no routing API. */
export function RouteMap({ activities, accent }: RouteMapProps) {
  const t = useTheme();

  const resolved = activities.map(resolveCoords).filter(Boolean) as { lat: number; lng: number }[];

  if (resolved.length === 0) {
    return null;
  }

  const coords = resolved.map((p) => ({ latitude: p.lat, longitude: p.lng }));

  // Center on the FIRST activity of the day (day's starting point)
  const centerLat = resolved[0].lat;
  const centerLng = resolved[0].lng;

  const mapsUrl = buildMapsUrl(resolved);

  return (
    <Pressable onPress={() => Linking.openURL(mapsUrl).catch(() => {})}>
      <View style={[styles.container, { borderColor: t.hairline, backgroundColor: t.card }]}>
        <MapView
          style={styles.map}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
          initialRegion={{
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}>
          {coords.map((c, i) => (
            <Marker key={`m-${i}`} coordinate={c} anchor={{ x: 0.5, y: 1 }}>
              <View style={[styles.badge, { backgroundColor: i === 0 ? '#FF3B30' : accent }]}>
                <Text style={styles.badgeText}>{i + 1}</Text>
              </View>
            </Marker>
          ))}
          {coords.length > 1 ? (
            <Polyline coordinates={coords} strokeColor={accent} strokeWidth={3} />
          ) : null}
        </MapView>
        <View style={styles.mapOverlay}>
          <Text style={styles.mapOverlayText}>Tap to open full route in Google Maps →</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
  },
  map: {
    width: '100%',
    height: 220,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  mapOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
