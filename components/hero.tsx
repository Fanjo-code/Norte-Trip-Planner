import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { IoniconName } from '@/types/trip';

interface HeroProps {
  title: string;
  subtitle?: string;
  footer?: string;
  icon?: IoniconName;
  /** Unsplash photo URL — shows a photo hero with gradient overlay. Falls back to gradient. */
  imageUrl?: string | null;
}

/**
 * Destination hero — shows a photo when available, gradient fallback otherwise.
 * This keeps the app feeling alive without requiring offline images.
 */
export function Hero({
  title,
  subtitle,
  footer,
  icon = 'compass',
  imageUrl,
}: HeroProps) {
  const scheme = useColorScheme();

  // Photo mode: image + dark gradient overlay for text readability.
  if (imageUrl) {
    return (
      <View style={styles.photoWrap}>
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          transition={400}
          style={styles.photo}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.photoOverlay}>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {footer ? <Text style={styles.footerText}>{footer}</Text> : null}
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Gradient fallback for unknown destinations.
  const colors: [string, string] =
    scheme === 'dark' ? ['#123A33', '#0A241F'] : ['#0E7C66', '#0A5B4A'];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <Ionicons
        name={icon}
        size={120}
        color="rgba(255,255,255,0.10)"
        style={styles.watermark}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {footer ? (
          <View style={styles.footer}>
            <Ionicons name="sparkles" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.footerText}>{footer}</Text>
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const HERO_HEIGHT = 220;

const styles = StyleSheet.create({
  // Photo mode
  photoWrap: {
    height: HERO_HEIGHT,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  photoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: Spacing.xl,
  },

  // Gradient fallback mode
  gradient: {
    minHeight: HERO_HEIGHT,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    top: -20,
    right: -14,
  },

  // Shared text
  content: {
    gap: Spacing.xs,
  },
  title: {
    color: '#FFFFFF',
    fontSize: FontSize.huge,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.small,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  footerText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
});
