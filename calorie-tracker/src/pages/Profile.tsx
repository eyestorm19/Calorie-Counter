import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedTargetCalories, setEditedTargetCalories] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [weeklyData, setWeeklyData] = useState<DailyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      setProfile(data);
      setEditedName(data.name);
      setEditedTargetCalories(data.targetCalories.toString());
    }
  };

  const loadWeeklyData = async () => {
    if (!user) return;
    try {
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const docIds = dates.map(date => `${user.uid}_${date}`);
      
      const weekData: DailyData[] = [];
      for (const docId of docIds) {
        const docRef = doc(db, 'dailyData', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          weekData.push(docSnap.data() as DailyData);
        } else {
          weekData.push({
            activities: [],
            totalConsumed: 0,
            totalBurned: 0,
            netCalories: 0,
            deficitToTarget: parseInt(editedTargetCalories) || 2000,
            date: docId.split('_')[1]
          });
        }
      }
      setWeeklyData(weekData);
    } catch (err) {
      console.error('Error loading weekly data:', err);
    }
  };

  const handleEdit = () => {
    if (profile) {
      setEditedName(profile.name);
      setEditedTargetCalories(profile.targetCalories.toString());
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setEditedName(profile.name);
      setEditedTargetCalories(profile.targetCalories.toString());
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setError('');
      setSuccess('');
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        name: editedName,
        targetCalories: parseInt(editedTargetCalories)
      });
      setSuccess('Profile updated successfully!');
      loadProfile();
      loadWeeklyData();
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  const chartData = {
    labels: weeklyData.map(data => {
      const date = new Date(data.date);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Net Calories',
        data: weeklyData.map(data => data.netCalories),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1
      },
      {
        label: 'Target',
        data: weeklyData.map(() => parseInt(editedTargetCalories) || 2000),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderDash: [5, 5]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Weekly Calorie Summary'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Calories'
        }
      }
    }
  };

  const weeklyStats = weeklyData.length > 0 ? {
    avgNet: Math.round(weeklyData.reduce((sum, day) => sum + day.netCalories, 0) / weeklyData.length),
    avgConsumed: Math.round(weeklyData.reduce((sum, day) => sum + day.totalConsumed, 0) / weeklyData.length),
    avgBurned: Math.round(weeklyData.reduce((sum, day) => sum + day.totalBurned, 0) / weeklyData.length),
    daysOnTarget: weeklyData.filter(day => {
      const target = parseInt(editedTargetCalories) || 2000;
      return day.netCalories <= target && day.netCalories >= target * 0.9;
    }).length
  } : {
    avgNet: 0,
    avgConsumed: 0,
    avgBurned: 0,
    daysOnTarget: 0
  };

  return (
    <div className="container">
      <h2>Profile</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {isLoading ? (
        <div className="loading-message">Loading profile data...</div>
      ) : (
        <>
          <div className="profile-info">
            <div className="profile-header">
              <h3>Profile Information</h3>
              {!isEditing && (
                <button onClick={handleEdit} className="edit-button">
                  Edit Profile
                </button>
              )}
            </div>
            
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

              {isEditing && (
                <div className="profile-actions">
                  <button onClick={handleSave} className="save-button">
                    Save Changes
                  </button>
                  <button onClick={handleCancel} className="cancel-button">
                    Cancel
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