import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Valid Ionicons glyph names, enforced by TypeScript. */
export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type Meal = 'Breakfast' | 'Lunch' | 'Dinner' | 'Drinks';

/** Trip pace: how many sights the traveler wants per day. */
export type Pace = 'relaxed' | 'balanced' | 'packed';

/** Budget style: drives restaurant choices and the daily spend estimate. */
export type BudgetTier = 'budget' | 'standard' | 'premium';

/**
 * Traveler preferences, set in the profile screen and evolving over time.
 * Used to personalize the itinerary — never to shrink the comprehensive place list.
 */
export interface UserPreferences {
  /** Interest categories: 'art' | 'food' | 'nightlife' | 'nature' | 'shopping' | 'history' | … */
  interests: string[];
  pace: Pace;
  budget: BudgetTier;
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  place: string;
  description: string;
  icon: IoniconName;
  /** Price in EUR; 0 means free. */
  price: number;
  lat?: number;
  lng?: number;
  url?: string;
}

export interface DayPlan {
  day: number;
  title: string;
  activities: Activity[];
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  meal: Meal;
  rating: number;
  /** 1–3, rendered as € .. €€€. */
  priceLevel: number;
  neighborhood: string;
  description: string;
  icon: IoniconName;
  isMustTry?: boolean;
  url?: string;
  lat?: number;
  lng?: number;
}

export interface Place {
  id: string;
  name: string;
  category: string;
  rating: number;
  timeToSpend: string;
  description: string;
  /** Price in EUR; 0 means free. */
  price: number;
  icon: IoniconName;
  url?: string;
  lat?: number;
  lng?: number;
}

export interface TransportOption {
  id: string;
  name: string;
  icon: IoniconName;
  description: string;
  bestFor: string;
  cost: string;
  isRecommended?: boolean;
  url?: string;
}

export interface Trip {
  destination: string;
  currency: 'EUR';
  /** Estimated spend per day on meals + local transport. */
  dailyBudget: number;
  itinerary: DayPlan[];
  restaurants: Restaurant[];
  places: Place[];
  transport: TransportOption[];
  /** 'live' = real API data, 'ai' = AI-generated */
  source?: 'live' | 'ai';
}

/** A trip the user has planned, persisted on device. */
export interface SavedTrip {
  id: string;
  destination: string;
  startDateISO: string;
  endDateISO: string;
}
