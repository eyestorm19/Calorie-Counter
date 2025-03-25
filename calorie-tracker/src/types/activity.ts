import { Timestamp } from 'firebase/firestore';

export interface Activity {
  id: string;
  name: string;
  type: 'consume' | 'burn';
  calories: number;
  timestamp: Timestamp;
}

export interface DailyData {
  activities: Activity[];
  totalConsumed: number;
  totalBurned: number;
  netCalories: number;
  deficitToTarget: number;
  date: string;
}

export interface UserProfile {
  name: string;
  targetCalories: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  timezone: string;  // User's timezone (e.g., 'America/New_York')
} 