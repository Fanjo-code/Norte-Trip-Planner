import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Fonts } from '@/constants/theme';
import type { IoniconName } from '@/types/trip';
export function Hero({
  title,
  subtitle,
  footer,
  imageUrl,
}: {
  title: string;
  subtitle?: string;
  footer?: string;
  icon?: IoniconName;
  imageUrl?: string | null;
}) {
  return (
    <View style={{ height: 330, borderRadius: 18, overflow: 'hidden', backgroundColor: '#495740' }}>
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
      )}
      <LinearGradient
        colors={['rgba(20,30,18,.06)', 'rgba(20,30,18,.72)']}
        style={{ flex: 1, padding: 32, justifyContent: 'flex-end', gap: 12 }}
      >
        <Text
          style={{ color: '#FFF', fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase' }}
        >
          {footer ?? 'A CITY TO CALL YOUR OWN'}
        </Text>
        <Text
          style={{
            fontFamily: Fonts.serif,
            fontSize: 64,
            lineHeight: 72,
            letterSpacing: -2,
            color: '#FFF',
          }}
        >
          {title}
        </Text>
        <Text style={{ color: '#FFFFFFD9', fontSize: 13 }}>{subtitle}</Text>
      </LinearGradient>
    </View>
  );
}
