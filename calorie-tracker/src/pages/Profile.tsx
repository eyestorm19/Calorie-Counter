import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDate } from '../contexts/DateContext';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, DailyData } from '../types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Link } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Common timezones for the dropdown
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
];

export default function Profile() {
  const { user, isNewUser, clearNewUserFlag } = useAuth();
  const { dbKey, formattedDate, isNewDay } = useDate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedTargetCalories, setEditedTargetCalories] = useState('');
  const [editedTimezone, setEditedTimezone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [weeklyData, setWeeklyData] = useState<DailyData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    avgNet: 0,
    avgConsumed: 0,
    avgBurned: 0,
    daysOnTarget: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // If user is new, automatically enable editing mode
  useEffect(() => {
    if (isNewUser) {
      setIsEditing(true);
    }
  }, [isNewUser]);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          await Promise.all([loadProfile(), loadWeeklyData()]);
        } catch (err) {
          console.error('Error loading data:', err);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [user, dbKey]);

  useEffect(() => {
    if (isNewDay && user) {
      console.log('New day detected in Profile, reloading data');
      const loadData = async () => {
        try {
          await Promise.all([loadProfile(), loadWeeklyData()]);
        } catch (err) {
          console.error('Error reloading data on new day:', err);
        }
      };
      loadData();
    }
  }, [isNewDay]);

  const loadProfile = async () => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      setProfile(data);
      setEditedName(data.name);
      setEditedTargetCalories(data.targetCalories.toString());
      setEditedTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  };

  const loadWeeklyData = async () => {
    if (!user) return;
    try {
      console.group('Weekly Data Loading Process');
      
      // 1. Get today's date from context
      const today = new Date(dbKey);
      console.log('Today (from context):', {
        dbKey,
        dateObject: today,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      // 2. Generate array of past 7 days
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        // Ensure we're using the correct year from dbKey
        const year = new Date(dbKey).getFullYear();
        date.setFullYear(year);
        return {
          date: date.toISOString().split('T')[0],
          displayDate: date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })
        };
      }).reverse();

      console.log('Week dates generated:', weekDates);
      
      // 3. Create weekly data structure
      const weeklyDataStructure = {
        dates: weekDates,
        dailyData: new Map<string, DailyData>(),
        summary: {
          totalConsumed: 0,
          totalBurned: 0,
          totalNet: 0,
          daysWithActivity: 0,
          daysOnTarget: 0
        }
      };

      // 4. Fetch data for each date
      const docRefs = weekDates.map(({ date }) => ({
        date,
        ref: doc(db, 'users', user.uid, 'dailyLogs', date)
      }));

      console.log('Document references created:', docRefs.map(ref => ({
        date: ref.date,
        path: ref.ref.path
      })));

      console.log('Fetching data from Firebase...');
      const snapshots = await Promise.all(
        docRefs.map(async ({ date, ref }) => {
          console.log(`Attempting to fetch data for ${date} from path: ${ref.path}`);
          const snap = await getDoc(ref);
          console.log(`Fetch result for ${date}:`, {
            exists: snap.exists(),
            id: snap.id,
            path: snap.ref.path,
            data: snap.exists() ? snap.data() : null
          });
          return { date, snapshot: snap };
        })
      );

      // 5. Process and store the data
      snapshots.forEach(({ date, snapshot }) => {
        console.group(`Processing ${date}`);
        console.log('Document details:', {
          path: snapshot.ref.path,
          exists: snapshot.exists(),
          id: snapshot.id
        });

        if (snapshot.exists()) {
          const data = snapshot.data() as DailyData;
          console.log('Document data:', {
            date: data.date,
            netCalories: data.netCalories,
            totalConsumed: data.totalConsumed,
            totalBurned: data.totalBurned,
            activitiesCount: data.activities?.length || 0,
            activities: data.activities
          });
          weeklyDataStructure.dailyData.set(date, data);
          
          // Update summary
          weeklyDataStructure.summary.totalConsumed += data.totalConsumed;
          weeklyDataStructure.summary.totalBurned += data.totalBurned;
          weeklyDataStructure.summary.totalNet += data.netCalories;
          if (data.activities?.length > 0) weeklyDataStructure.summary.daysWithActivity++;
          const target = parseInt(editedTargetCalories) || 2000;
          if (data.netCalories <= target) {
            weeklyDataStructure.summary.daysOnTarget++;
          }
        } else {
          console.log('No document found. Details:', {
            date,
            path: snapshot.ref.path,
            exists: snapshot.exists()
          });
          const defaultData: DailyData = {
            activities: [],
            totalConsumed: 0,
            totalBurned: 0,
            netCalories: 0,
            deficitToTarget: parseInt(editedTargetCalories) || 2000,
            date: date
          };
          weeklyDataStructure.dailyData.set(date, defaultData);
        }
        console.groupEnd();
      });

      // 6. Create final array for state update
      const weekData = weekDates.map(({ date }) => 
        weeklyDataStructure.dailyData.get(date)!
      );

      // Calculate weekly stats
      const stats = {
        avgNet: Math.round(weeklyDataStructure.summary.totalNet / weekData.length),
        avgConsumed: Math.round(weeklyDataStructure.summary.totalConsumed / weekData.length),
        avgBurned: Math.round(weeklyDataStructure.summary.totalBurned / weekData.length),
        daysOnTarget: weeklyDataStructure.summary.daysOnTarget
      };

      // Log final data structure
      console.log('Weekly data structure:', {
        dates: weeklyDataStructure.dates.map(d => d.date),
        summary: weeklyDataStructure.summary,
        stats,
        dailyDataMap: Object.fromEntries(weeklyDataStructure.dailyData),
        finalArray: weekData.map(data => ({
          date: data.date,
          netCalories: data.netCalories,
          activitiesCount: data.activities?.length || 0
        }))
      });

      setWeeklyData(weekData);
      setWeeklyStats(stats);
      console.groupEnd();
    } catch (err) {
      console.error('Error loading weekly data:', err);
      console.groupEnd();
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    resetEditForm();
  };

  const resetEditForm = () => {
    setEditedName(profile?.name || '');
    setEditedTargetCalories(profile?.targetCalories.toString() || '2000');
    setEditedTimezone(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      const targetCaloriesValue = parseInt(editedTargetCalories);
      if (isNaN(targetCaloriesValue) || targetCaloriesValue <= 0) {
        setError('Please enter a valid target calories value');
        return;
      }
      
      const updatedProfile = {
        name: editedName,
        targetCalories: targetCaloriesValue,
        timezone: editedTimezone,
        updatedAt: new Date()
      };
      
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, updatedProfile);
      
      // If user was new, clear the flag after successful profile update
      if (isNewUser) {
        clearNewUserFlag();
      }
      
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      loadProfile(); // Reload profile data
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  const chartData = {
    labels: weeklyData.map(data => {
      const date = new Date(`${data.date}T00:00:00`);
      const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return label;
    }),
    datasets: [
      {
        label: 'Net Calories',
        data: weeklyData.map(data => data.netCalories),
        borderColor: '#E91E63',  // Dark Pink
        backgroundColor: '#E91E63',
        tension: 0.1,
        fill: false
      },
      {
        label: 'Target',
        data: weeklyData.map(() => parseInt(editedTargetCalories) || 2000),
        borderColor: '#E91E63',  // Dark Pink
        backgroundColor: '#E91E63',
        borderDash: [5, 5],
        fill: false
      }
    ]
  };

  console.group('Chart Data Mapping Process');
  
  // Log the data mapping process
  console.log('Data mapping details:', weeklyData.map((data, index) => {
    const date = new Date(`${data.date}T00:00:00`);
    const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return {
      index,
      originalDate: data.date,
      dateObject: date.toString(),
      formattedLabel: label,
      netCalories: data.netCalories,
      totalConsumed: data.totalConsumed,
      totalBurned: data.totalBurned,
      isDefaultData: !data.activities || data.activities.length === 0
    };
  }));

  // Verify data alignment
  console.log('Data alignment check:', {
    totalDays: weeklyData.length,
    datesInOrder: weeklyData.map(d => d.date),
    labelsInOrder: chartData.labels,
    netCaloriesInOrder: chartData.datasets[0].data,
    targetLineValues: chartData.datasets[1].data
  });

  // Check for any potential gaps or misalignments
  const dataIntegrityCheck = weeklyData.map((data, index) => {
    const nextDay = index < weeklyData.length - 1 ? weeklyData[index + 1].date : null;
    let isSequential = false;
    
    if (nextDay) {
      const currentDate = new Date(data.date);
      const nextDate = new Date(nextDay);
      const diffTime = Math.abs(nextDate.getTime() - currentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isSequential = diffDays === 1;
    }

    return {
      currentDate: data.date,
      nextDate: nextDay,
      isSequential: nextDay ? isSequential : 'lastDay',
      hasData: data.activities && data.activities.length > 0
    };
  });

  console.log('Data integrity check:', dataIntegrityCheck);
  console.groupEnd();

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          },
          color: '#333',
          boxWidth: 8,
          boxHeight: 8
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString() + ' cal';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value) {
            return value.toLocaleString() + ' cal';
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="container profile-container">
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          {isNewUser && (
            <div className="welcome-message">
              <h3>Welcome to Apollo!</h3>
              <p>Please take a moment to update your profile information below, especially your daily calorie target.</p>
            </div>
          )}

          <div className="profile-card">
            <div className="profile-header">
              <h2>Profile</h2>
              {!isEditing && (
                <button onClick={handleEdit} className="edit-button" title="Edit Profile">
                  <i className="material-icons">edit</i>
                </button>
              )}
            </div>

            {/* AI capabilities info card */}
            <div className="ai-info-card">
              <div className="ai-info-content">
                <h3>🧠 AI-Powered Tracking</h3>
                <p>Apollo uses AI to automatically log your food and exercise. Simply describe what you ate or did in natural language.</p>
                <Link to="/help" className="learn-more-link">Learn how it works</Link>
              </div>
            </div>
            
            {/* Rest of profile content */}
            <div className="profile-content">
              <div className="profile-field">
                <span className="field-label">Name:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="inline-edit-input"
                  />
                ) : (
                  <span className="field-value">{profile?.name}</span>
                )}
              </div>

              <div className="profile-field">
                <span className="field-label">Email:</span>
                <span className="field-value">{user?.email}</span>
              </div>

              <div className="profile-field">
                <span className="field-label">Daily Target Calories:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedTargetCalories}
                    onChange={(e) => setEditedTargetCalories(e.target.value)}
                    className="inline-edit-input"
                  />
                ) : (
                  <span className="field-value">{profile?.targetCalories}</span>
                )}
              </div>

              <div className="profile-field">
                <span className="field-label">Timezone:</span>
                {isEditing ? (
                  <select
                    value={editedTimezone}
                    onChange={(e) => setEditedTimezone(e.target.value)}
                    className="inline-edit-input"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="field-value">
                    {COMMON_TIMEZONES.find(tz => tz.value === profile?.timezone)?.label || profile?.timezone}
                  </span>
                )}
              </div>

              {isEditing && (
                <div className="profile-actions">
                  <button onClick={handleSave} className="save-button" title="Save Changes">
                    <i className="material-icons">check</i>
                  </button>
                  <button onClick={handleCancel} className="cancel-button" title="Cancel">
                    <i className="material-icons">close</i>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="weekly-summary">
            <h3>Weekly Summary</h3>
            <div className="weekly-stats">
              <div className="stat-item">
                <span className="stat-label">Avg. Net Calories</span>
                <span className="stat-value">{weeklyStats.avgNet}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Avg. Calories Consumed</span>
                <span className="stat-value">{weeklyStats.avgConsumed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Avg. Calories Burned</span>
                <span className="stat-value">{weeklyStats.avgBurned}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Days On Target</span>
                <span className="stat-value">{weeklyStats.daysOnTarget} / 7</span>
              </div>
            </div>
            <div className="weekly-chart">
              <Line options={chartOptions} data={chartData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
} 