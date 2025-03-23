export interface Activity {
  id: string;
  name: string;
  type: 'consume' | 'burn';
  calories: number;
  timestamp: any; // Firebase Timestamp
}

export interface DailyData {
  activities: Activity[];
  totalConsumed: number;
  totalBurned: number;
  netCalories: number;
  deficitToTarget: number;
  date: string;
  userId?: string; // Making userId optional
}

export interface UserProfile {
  name: string;
  email: string;
  targetCalories: number;
} 