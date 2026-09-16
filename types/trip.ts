import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
export type IoniconName = ComponentProps<typeof Ionicons>['name'];
export type Meal = 'Breakfast' | 'Lunch' | 'Dinner' | 'Drinks';
export type Pace = 'relaxed' | 'balanced' | 'packed';
export type BudgetTier = 'budget' | 'standard' | 'premium';
export interface UserPreferences {
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
  price: number | null;
  lat?: number;
  lng?: number;
  url?: string;
  placeName?: string;
  duration?: string;
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
  rating: number | null;
  priceLevel: number | null;
  neighborhood: string;
  description: string;
  icon: IoniconName;
  isMustTry?: boolean;
  url?: string;
  lat?: number;
  lng?: number;
  image?: string;
}
export interface Place {
  id: string;
  name: string;
  category: string;
  rating: number | null;
  timeToSpend: string;
  description: string;
  price: number | null;
  icon: IoniconName;
  url?: string;
  lat?: number;
  lng?: number;
  image?: string;
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
  dailyBudget: number;
  itinerary: DayPlan[];
  restaurants: Restaurant[];
  places: Place[];
  transport: TransportOption[];
  source?: 'live' | 'ai';
  notes?: string[];
  createdAt?: string;
}
export interface SavedTrip {
  id: string;
  destination: string;
  startDateISO: string;
  endDateISO: string;
}
