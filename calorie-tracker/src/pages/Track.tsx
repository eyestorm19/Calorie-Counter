import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { Activity, DailyData, UserProfile } from '../types';
import ChatInput from '../components/ChatInput';

export default function Track() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [calories, setCalories] = useState('');
  const [isBurn, setIsBurn] = useState(false);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [animatedNetCalories, setAnimatedNetCalories] = useState(0);

  const targetCalories = userProfile?.targetCalories || 2000;
  const consumedCalories = activities.reduce((sum, a) => a.type === 'consume' ? sum + a.calories : sum, 0);
  const burnedCalories = activities.reduce((sum, a) => a.type === 'burn' ? sum + a.calories : sum, 0);
  const netCalories = consumedCalories - burnedCalories;

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadTodayData();
    }
  }, [user]);

  useEffect(() => {
    setAnimatedNetCalories(0);
    const timer = setTimeout(() => {
      setAnimatedNetCalories(netCalories);
    }, 100);
    return () => clearTimeout(timer);
  }, [netCalories]);

  const loadUserProfile = async () => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserProfile(docSnap.data() as UserProfile);
    }
  };

  const loadTodayData = async () => {
    if (!user) {
      console.log('No user found in loadTodayData');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const docPath = `${user.uid}_${today}`;
      const docRef = doc(db, 'dailyData', docPath);
      
      console.log('Loading today data:', {
        path: docPath,
        user: {
          uid: user.uid,
          email: user.email,
          isAuthenticated: !!user,
          token: user.refreshToken
        }
      });

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as DailyData;
        console.log('Loaded data:', data);
        setActivities(data.activities);
      } else {
        console.log('No data exists for today, will create new document');
      }
    } catch (err) {
      console.error('Error loading today data:', err);
      if (err instanceof Error) {
        const firebaseError = err as any;
        console.error('Error details:', {
          message: err.message,
          name: err.name,
          code: firebaseError.code,
          stack: err.stack
        });
      }
    }
  };

  const handleEdit = (activity: Activity) => {
    console.log('Editing activity:', activity);
    setEditingActivity(activity);
    setNewActivity(activity.name);
    setCalories(activity.calories.toString());
    setIsBurn(activity.type === 'burn');
  };

  const handleDelete = async (activityId: string) => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const docPath = `${user.uid}_${today}`;
      const docRef = doc(db, 'dailyData', docPath);

      const updatedActivities = activities.filter(a => a.id !== activityId);
      const updatedConsumed = updatedActivities
        .filter(a => a.type === 'consume')
        .reduce((sum, a) => sum + a.calories, 0);
      const updatedBurned = updatedActivities
        .filter(a => a.type === 'burn')
        .reduce((sum, a) => sum + a.calories, 0);
      const updatedNet = updatedConsumed - updatedBurned;
      const deficitToTarget = targetCalories - updatedNet;

      const dailyData: DailyData = {
        activities: updatedActivities,
        totalConsumed: updatedConsumed,
        totalBurned: updatedBurned,
        netCalories: updatedNet,
        deficitToTarget,
        date: today
      };

      await setDoc(docRef, dailyData);
      setActivities(updatedActivities);
    } catch (err) {
      console.error('Error deleting activity:', err);
      setError('Failed to delete activity. Please try again.');
    }
  };

  const handleActivityAdd = async (activityData: Omit<Activity, 'id' | 'timestamp'>) => {
    if (!user) return;

    try {
      setError('');
      const today = new Date().toISOString().split('T')[0];
      const docPath = `${user.uid}_${today}`;
      const docRef = doc(db, 'dailyData', docPath);

      const docSnap = await getDoc(docRef);
      let currentActivities = activities;
      if (docSnap.exists()) {
        const data = docSnap.data() as DailyData;
        currentActivities = data.activities;
      }

      const newActivity: Activity = {
        id: Date.now().toString(),
        ...activityData,
        timestamp: Timestamp.now()
      };

      const updatedActivities = [...currentActivities, newActivity];
      const updatedConsumed = updatedActivities
        .filter(a => a.type === 'consume')
        .reduce((sum, a) => sum + a.calories, 0);
      const updatedBurned = updatedActivities
        .filter(a => a.type === 'burn')
        .reduce((sum, a) => sum + a.calories, 0);
      const updatedNet = updatedConsumed - updatedBurned;
      const deficitToTarget = targetCalories - updatedNet;

      const dailyData: DailyData = {
        activities: updatedActivities,
        totalConsumed: updatedConsumed,
        totalBurned: updatedBurned,
        netCalories: updatedNet,
        deficitToTarget,
        date: today
      };

      await setDoc(docRef, dailyData);
      setActivities(updatedActivities);
    } catch (err) {
      console.error('Error adding activity:', err);
      setError('Failed to add activity');
    }
  };

  return (
    <div className="container">
      <h2>Track Calories</h2>
      {error && <div className="error">{error}</div>}

      <ChatInput onActivityAdd={handleActivityAdd} />

      <div className="calorie-progress">
        <h3>Today's Progress</h3>
        <div className="progress-container">
          <div className="progress-bar-wrapper">
            {/* Net calories marker above */}
            <div className="progress-markers-top">
              <span 
                className={`marker current ${animatedNetCalories > 0 ? 'positive' : 'negative'}`}
                style={{
                  left: `${animatedNetCalories < 0 
                    ? 50 - (Math.abs(animatedNetCalories) / (Math.max(targetCalories, Math.abs(netCalories))) * 50) 
                    : Math.min(100, 50 + (animatedNetCalories / targetCalories * 50))}%`
                }}
              >
                {netCalories}
              </span>
            </div>
            {/* Background bar showing target range */}
            <div className="progress-background">
              <div className="target-range" style={{ width: '50%', left: '50%' }} />
            </div>
            {/* Progress bar */}
            {netCalories !== 0 && (
              <div 
                className={`progress-fill ${animatedNetCalories > 0 ? 'positive' : 'negative'}`}
                style={{
                  left: animatedNetCalories < 0 ? 'auto' : '50%',
                  right: animatedNetCalories < 0 ? '50%' : 'auto',
                  width: `${animatedNetCalories < 0 
                    ? Math.abs(animatedNetCalories) / (Math.max(targetCalories, Math.abs(netCalories))) * 50
                    : Math.min(50, (animatedNetCalories / targetCalories) * 50)}%`
                }}
              />
            )}
            {/* Zero and target markers below */}
            <div className="progress-markers-bottom">
              <div className="marker-line" style={{ left: '50%' }} />
              <div className="marker-line" style={{ left: '100%' }} />
              <span className="marker zero">0</span>
              <span className="marker target">Target: {targetCalories}</span>
            </div>
          </div>
          <div className="progress-details">
            <div className="detail-item">
              <span className="detail-label">Consumed</span>
              <span className="detail-value">{consumedCalories}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Burned</span>
              <span className="detail-value">{burnedCalories}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="activities-list">
        <h3>Today's Activities</h3>
        {activities.length === 0 ? (
          <p>No activities recorded for today</p>
        ) : (
          <ul>
            {[...activities]
              .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
              .map((activity) => (
              <li key={activity.id} className="activity-item">
                {editingActivity?.id === activity.id ? (
                  <div className="activity-edit">
                    <div className="edit-fields">
                      <input
                        type="text"
                        value={newActivity}
                        onChange={(e) => setNewActivity(e.target.value)}
                        className="edit-input"
                      />
                      <input
                        type="number"
                        value={calories}
                        onChange={(e) => setCalories(e.target.value)}
                        className="edit-input"
                      />
                      <label className="burn-checkbox">
                        <input
                          type="checkbox"
                          checked={isBurn}
                          onChange={(e) => setIsBurn(e.target.checked)}
                        />
                        Burn
                      </label>
                    </div>
                    <div className="edit-actions">
                      <button 
                        onClick={() => {
                          setEditingActivity(null);
                          setNewActivity('');
                          setCalories('');
                          setIsBurn(false);
                        }}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="activity-info">
                      <div className="activity-details">
                        <span className="activity-name">{activity.name}</span>
                        <span className="activity-time">
                          {new Date(activity.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={`calorie-value ${activity.type === 'burn' ? 'burned' : 'consumed'}`}>
                        {activity.type === 'burn' ? '-' : '+'}{activity.calories} cal
                      </span>
                    </div>
                    <div className="activity-actions">
                      <button 
                        onClick={() => handleEdit(activity)}
                        className="edit-button"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(activity.id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 