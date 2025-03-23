import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { Activity, DailyData, UserProfile } from '../types';

export default function Track() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [calories, setCalories] = useState('');
  const [isBurn, setIsBurn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      setSuccess('Activity deleted successfully!');
    } catch (err) {
      console.error('Error deleting activity:', err);
      setError('Failed to delete activity. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.log('No user found in handleSubmit');
      return;
    }
    if (!newActivity || !calories) {
      console.log('Missing required fields:', { newActivity, calories });
      return;
    }

    try {
      setError('');
      setSuccess('');
      const today = new Date().toISOString().split('T')[0];
      const docPath = `${user.uid}_${today}`;
      const docRef = doc(db, 'dailyData', docPath);

      // Log the current state
      console.log('Current state before update:', {
        editingActivity,
        newActivity,
        calories,
        isBurn,
        activities: activities.length
      });

      // Validate calories input
      const caloriesNum = parseInt(calories);
      if (isNaN(caloriesNum) || caloriesNum <= 0) {
        setError('Please enter a valid number of calories');
        return;
      }

      // First, get the current data
      const docSnap = await getDoc(docRef);
      let currentActivities = activities;
      if (docSnap.exists()) {
        const data = docSnap.data() as DailyData;
        currentActivities = data.activities;
      }

      let updatedActivities: Activity[];
      if (editingActivity) {
        // Update existing activity
        console.log('Updating activity:', {
          id: editingActivity.id,
          oldName: editingActivity.name,
          newName: newActivity,
          oldCalories: editingActivity.calories,
          newCalories: caloriesNum,
          oldType: editingActivity.type,
          newType: isBurn ? 'burn' : 'consume'
        });

        updatedActivities = currentActivities.map(activity => 
          activity.id === editingActivity.id 
            ? {
                id: editingActivity.id,
                name: newActivity.trim(),
                calories: caloriesNum,
                type: isBurn ? 'burn' : 'consume' as const,
                timestamp: Timestamp.now()
              }
            : activity
        );
      } else {
        // Add new activity
        const newActivityObj: Activity = {
          id: Date.now().toString(),
          name: newActivity.trim(),
          type: isBurn ? 'burn' : 'consume' as const,
          calories: caloriesNum,
          timestamp: Timestamp.now()
        };
        updatedActivities = [...currentActivities, newActivityObj];
      }

      console.log('Activities after modification:', {
        before: currentActivities.length,
        after: updatedActivities.length,
        editMode: !!editingActivity
      });

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

      console.log('Saving updated data:', {
        activitiesCount: updatedActivities.length,
        totalConsumed: updatedConsumed,
        totalBurned: updatedBurned,
        netCalories: updatedNet
      });

      await setDoc(docRef, dailyData);

      // Update local state
      setActivities(updatedActivities);
      setNewActivity('');
      setCalories('');
      setIsBurn(false);
      setEditingActivity(null);
      setSuccess(editingActivity ? 'Activity updated successfully!' : 'Activity added successfully!');
    } catch (err) {
      console.error('Error saving activity:', err);
      if (err instanceof Error) {
        setError(`Failed to ${editingActivity ? 'update' : 'add'} activity: ${err.message}`);
      } else {
        setError(`Failed to ${editingActivity ? 'update' : 'add'} activity. Please try again.`);
      }
    }
  };

  return (
    <div className="container">
      <h2>Track Calories</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="activity">Activity</label>
          <input
            type="text"
            id="activity"
            value={newActivity}
            onChange={(e) => setNewActivity(e.target.value)}
            placeholder="e.g., Breakfast, Running"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="calories">Calories</label>
          <input
            type="number"
            id="calories"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isBurn}
              onChange={(e) => setIsBurn(e.target.checked)}
            />
            This is a calorie burn activity
          </label>
        </div>
        <div className="form-actions">
          <button type="submit">
            {editingActivity ? 'Update Activity' : 'Add Activity'}
          </button>
          {editingActivity && (
            <button 
              type="button" 
              onClick={() => {
                setEditingActivity(null);
                setNewActivity('');
                setCalories('');
                setIsBurn(false);
              }}
              className="cancel-button"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="calorie-progress">
        <h3>Today's Progress</h3>
        <div className="progress-container">
          <div className="progress-bar-wrapper">
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
                  width: `${Math.min(Math.abs(animatedNetCalories) / targetCalories * 50, 50)}%`
                }}
              />
            )}
            {/* X-axis markers */}
            <div className="progress-markers">
              <div className="marker-line" style={{ left: '50%' }} />
              <div className="marker-line" style={{ left: '100%' }} />
              <span className="marker zero">0</span>
              <span className="marker target">Target: {targetCalories}</span>
              <span 
                className={`marker current ${animatedNetCalories > 0 ? 'positive' : 'negative'}`}
                style={{
                  left: `${animatedNetCalories < 0 ? 50 - (Math.abs(animatedNetCalories) / targetCalories * 50) : 50 + (animatedNetCalories / targetCalories * 50)}%`
                }}
              >
                {netCalories}
              </span>
            </div>
          </div>
          <div className="progress-details">
            <div className="detail-item">
              <span className="detail-label">Net Calories</span>
              <span className="detail-value">{netCalories}</span>
            </div>
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
                        onClick={handleSubmit}
                        className="save-button"
                      >
                        Save
                      </button>
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