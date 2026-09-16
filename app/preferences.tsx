import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Action, Body, Eyebrow, Heading, Panel, Pill } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences, INTEREST_LABELS } from '@/contexts/preferences-context';
import type { Pace, BudgetTier } from '@/types/trip';
export default function Preferences() {
  const t = useTheme();
  const { prefs, updatePrefs } = usePreferences();
  return (
    <Screen contentStyle={{ maxWidth: 860 }}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))}>
        <Text style={{ fontSize: 12, color: t.accent }}>← Back</Text>
      </Pressable>
      <View style={{ gap: 10 }}>
        <Eyebrow>MAKE YOURSELF AT HOME</Eyebrow>
        <Heading large>Your kind of journey.</Heading>
        <Body>
          The places you love. The pace you keep. A few preferences to make your next itinerary feel
          more like you.
        </Body>
      </View>
      <Panel>
        <Eyebrow>01 / FOLLOW YOUR CURIOSITY</Eyebrow>
        <Heading>What draws you in?</Heading>
        <Body>Pick as many as you like. The city’s essential sights stay in your collection.</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Object.entries(INTEREST_LABELS).map(([key, label]) => (
            <Pill
              key={key}
              label={label}
              active={prefs.interests.includes(key)}
              onPress={() =>
                updatePrefs({
                  interests: prefs.interests.includes(key)
                    ? prefs.interests.filter((i) => i !== key)
                    : [...prefs.interests, key],
                })
              }
            />
          ))}
        </View>
      </Panel>
      <Panel>
        <Eyebrow>02 / FIND YOUR RHYTHM</Eyebrow>
        <Heading>How do your days unfold?</Heading>
        {(
          [
            {
              key: 'relaxed',
              title: 'The slow wanderer',
              desc: '2 sights a day. Time for another coffee.',
            },
            {
              key: 'balanced',
              title: 'A little of everything',
              desc: '3 sights a day. A good balance of plans and possibility.',
            },
            {
              key: 'packed',
              title: 'Make every moment count',
              desc: '5 sights a day. For the endlessly curious.',
            },
          ] as { key: Pace; title: string; desc: string }[]
        ).map((o) => (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: prefs.pace === o.key }}
            onPress={() => updatePrefs({ pace: o.key })}
            style={{
              flexDirection: 'row',
              gap: 16,
              padding: 18,
              borderWidth: 1,
              borderColor: prefs.pace === o.key ? t.accent : t.hairline,
              borderRadius: 12,
              backgroundColor: prefs.pace === o.key ? t.accentSoft : t.card,
            }}
          >
            <Ionicons
              name={prefs.pace === o.key ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={t.accent}
            />
            <View style={{ gap: 6, flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>{o.title}</Text>
              <Body>{o.desc}</Body>
            </View>
          </Pressable>
        ))}
      </Panel>
      <Panel>
        <Eyebrow>03 / A SEAT AT THE TABLE</Eyebrow>
        <Heading>What’s your dining style?</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(
            [
              { key: 'budget', label: 'Casual & local' },
              { key: 'standard', label: 'A happy medium' },
              { key: 'premium', label: 'Something special' },
            ] as { key: BudgetTier; label: string }[]
          ).map((x) => (
            <Pill
              key={x.key}
              label={x.label}
              active={prefs.budget === x.key}
              onPress={() => updatePrefs({ budget: x.key })}
            />
          ))}
        </View>
        <Body>
          We use price information where available. Prices aren’t estimated or presented as
          verified.
        </Body>
      </Panel>
      <Action
        label="Save my travel style"
        icon="checkmark"
        onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))}
      />
      <Text style={{ textAlign: 'center', color: t.textSecondary, fontSize: 12 }}>
        Changes shape new journeys. Your saved itineraries stay as planned.
      </Text>
    </Screen>
  );
}
