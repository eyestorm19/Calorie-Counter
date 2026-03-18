import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserProfile } from '../types/activity';

interface DateContextType {
  currentDate: string;  // ISO date string in user's timezone
  formattedDate: string;  // Formatted date for display
  dbKey: string;  // Date string for database queries (selected date or today)
  todayDbKey: string;  // Always actual today (for Profile weekly summary)
  isNewDay: boolean;  // Flag indicating if the date just changed
  setSelectedDate: (date: string | null) => void;  // Select a date to view (null = today)
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<string>('');
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [dbKey, setDbKey] = useState<string>('');
  const [todayDbKey, setTodayDbKey] = useState<string>('');
  const [selectedDate, setSelectedDateState] = useState<string | null>(null);
  const [isNewDay, setIsNewDay] = useState<boolean>(false);
  const [lastCheckedDate, setLastCheckedDate] = useState<string>('');
  const [userTimezone, setUserTimezone] = useState<string>('');

  // Load user's timezone from profile
  useEffect(() => {
    const loadUserTimezone = async () => {
      if (!user) return;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        setUserTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      } else {
        setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
    };
    loadUserTimezone();
  }, [user]);

  // Function to get current date in user's timezone
  const getCurrentDate = () => {
    const now = new Date();
    const tz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    
    // Set the time to midnight in the user's timezone
    userDate.setHours(0, 0, 0, 0);
    
    console.log('DateContext - User timezone:', userTimezone);
    console.log('DateContext - Current date in timezone:', userDate.toISOString());
    
    return userDate;
  };

  // Function to format date for different purposes
  const formatDates = (date: Date) => {
    const tz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formatted = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: tz
    });

    // Format date for database (YYYY-MM-DD)
    const dbDate = date.toISOString().split('T')[0];

    console.log('DateContext - Formatted dates:', {
      formatted,
      dbDate,
      timezone: userTimezone
    });

    return { formatted, dbDate };
  };

  // Update dates and check for new day
  const updateDates = () => {
    const date = getCurrentDate();
    const { formatted, dbDate } = formatDates(date);

    // Check if the date has changed
    if (lastCheckedDate && lastCheckedDate !== dbDate) {
      console.log('DateContext - New day detected:', {
        lastCheckedDate,
        currentDate: dbDate
      });
      setIsNewDay(true);
      // Reset isNewDay after a short delay
      setTimeout(() => setIsNewDay(false), 1000);
    }

    setCurrentDate(dbDate);
    setTodayDbKey(dbDate);
    setLastCheckedDate(dbDate);
    if (!selectedDate) {
      setFormattedDate(formatted);
      setDbKey(dbDate);
    }
  };

  const setSelectedDate = (date: string | null) => {
    setSelectedDateState(date);
    if (date) {
      const d = new Date(date + 'T12:00:00');
      const formatted = d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      setFormattedDate(formatted);
      setDbKey(date);
    } else {
      const dateObj = getCurrentDate();
      const { formatted, dbDate } = formatDates(dateObj);
      setFormattedDate(formatted);
      setDbKey(dbDate);
    }
  };

  // Initialize dates
  useEffect(() => {
    if (userTimezone) {
      updateDates();
    }
  }, [userTimezone]);

  // Check for date changes every minute
  useEffect(() => {
    if (!userTimezone) return;

    const interval = setInterval(() => {
      updateDates();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [lastCheckedDate, userTimezone, selectedDate]);

  return (
    <DateContext.Provider
      value={{
        currentDate,
        formattedDate,
        dbKey,
        todayDbKey,
        isNewDay,
        setSelectedDate
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
} 