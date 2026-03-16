import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDate } from '../contexts/DateContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Activity, DailyData, UserProfile } from '../types';
import ChatInput from '../components/ChatInput';

export default function Track() {
  const { user } = useAuth();
  const { dbKey, formattedDate, isNewDay } = useDate();
  const [newActivity, setNewActivity] = useState('');
  const [calories, setCalories] = useState('');
  const [isBurn, setIsBurn] = useState(false);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [animatedNetCalories, setAnimatedNetCalories] = useState(0);
  const [todayData, setTodayData] = useState<DailyData>({
    activities: [],
    totalConsumed: 0,
    totalBurned: 0,
    netCalories: 0,
    deficitToTarget: 2000,
    date: ''
  });
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editName, setEditName] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [consumedExpanded, setConsumedExpanded] = useState(false);
  const [burnedExpanded, setBurnedExpanded] = useState(false);

  // Add effect to log state changes
  useEffect(() => {
    console.log('🔄 todayData state updated:', {
      activities: todayData.activities,
      totalConsumed: todayData.totalConsumed,
      totalBurned: todayData.totalBurned,
      netCalories: todayData.netCalories,
      date: todayData.date
    });
  }, [todayData]);

  // Add effect to log activities being rendered
  useEffect(() => {
    console.log('🎯 Activities being rendered:', {
      activitiesCount: todayData.activities.length,
      activities: todayData.activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        calories: activity.calories,
        type: activity.type,
        timestamp: activity.timestamp
      }))
    });
  }, [todayData.activities]);

  const targetCalories = userProfile?.targetCalories || 2000;

  // Add utility function to calculate totals
  const calculateTotals = (activities: Activity[]) => {
    console.log('🔢 Calculating totals for activities:', activities);
    
    const consumed = activities
      .filter(a => a.type === 'consume')
      .reduce((sum, a) => {
        console.log(`➕ Adding consumed calories for ${a.name}: ${a.calories}`);
        return sum + a.calories;
      }, 0);
    
    const burned = activities
      .filter(a => a.type === 'burn')
      .reduce((sum, a) => {
        console.log(`➖ Adding burned calories for ${a.name}: ${a.calories}`);
        return sum + a.calories;
      }, 0);
    
    const net = consumed - burned;
    const deficit = targetCalories - net;
    
    console.log('📊 Final calculations:', {
      totalConsumed: consumed,
      totalBurned: burned,
      netCalories: net,
      deficitToTarget: deficit
    });
    
    return {
      totalConsumed: consumed,
      totalBurned: burned,
      netCalories: net,
      deficitToTarget: deficit
    };
  };

  // Add function to sync data with Firebase
  const syncWithFirebase = async (activities: Activity[], dateKey: string) => {
    if (!user) return;

    try {
      console.log('🔄 Starting sync with Firebase for date:', dateKey);
      console.log('📦 Activities to sync:', activities);
      
      const docRef = doc(db, 'users', user.uid, 'dailyLogs', dateKey);
      const updatedTotals = calculateTotals(activities);
      
      const dailyData: DailyData = {
        activities,
        ...updatedTotals,
        date: dateKey
      };

      console.log('💾 Saving to Firebase:', dailyData);
      // Update Firebase
      await setDoc(docRef, dailyData);
      
      // Update local state
      setTodayData(dailyData);
      console.log('✅ Sync completed successfully');
    } catch (err) {
      console.error('❌ Error syncing with Firebase:', err);
      setError('Failed to sync data');
    }
  };

  // Load data when user is available or date changes
  useEffect(() => {
    if (user) {
      console.log('👤 User available, loading profile and data');
      loadUserProfile();
      loadTodayData();
    }
  }, [user, dbKey]); // Reload when date changes

  // Reload data when isNewDay is true
  useEffect(() => {
    if (isNewDay && user) {
      console.log('🔄 New day detected, reloading data');
      loadTodayData();
    }
  }, [isNewDay]);

  useEffect(() => {
    setAnimatedNetCalories(0);
    const timer = setTimeout(() => {
      setAnimatedNetCalories(todayData.netCalories);
    }, 100);
    return () => clearTimeout(timer);
  }, [todayData.netCalories]);

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
      console.log('❌ No user found in loadTodayData');
      return;
    }
    try {
      console.log('📥 Starting to load today data');
      
      // Get today's date from context
      const today = new Date(dbKey);
      const todayKey = today.toISOString().split('T')[0];
      
      // New path: users/{userId}/dailyLogs/{date}
      const docRef = doc(db, 'users', user.uid, 'dailyLogs', todayKey);
      
      console.log('🔍 Fetching data from Firebase:', {
        path: `users/${user.uid}/dailyLogs/${todayKey}`,
        date: todayKey
      });

      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as DailyData;
        console.log('📦 Data received from Firebase:', {
          date: data.date,
          activitiesCount: data.activities?.length || 0,
          totalConsumed: data.totalConsumed,
          totalBurned: data.totalBurned,
          netCalories: data.netCalories,
          activities: data.activities // Log activities to check structure
        });
        
        // Only set data if it's from today
        if (data.date === todayKey) {
          console.log('✅ Setting today data in local state');
          // Log raw activities to check types
          console.log('🔍 Raw activities from Firebase:', data.activities);
          
          // Ensure activities have the correct structure
          const processedData = {
            ...data,
            activities: data.activities?.map(activity => {
              console.log('📦 Processing activity:', activity);
              return {
                ...activity,
                id: activity.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: activity.timestamp || Timestamp.now(),
                name: activity.name || '',
                calories: activity.calories || 0,
                type: (activity.type === 'burn' ? 'burn' : 'consume') as 'consume' | 'burn'
              };
            }) || []
          };
          console.log('✨ Processed activities:', processedData.activities);
          setTodayData(processedData);
        } else {
          console.log('🔄 Creating new document for today as existing data is from:', data.date);
          // If data exists but is from a different day, create new document
          const newDailyData: DailyData = {
            activities: [],
            totalConsumed: 0,
            totalBurned: 0,
            netCalories: 0,
            deficitToTarget: targetCalories,
            date: todayKey
          };
          await setDoc(docRef, newDailyData);
          console.log('✨ Initialized new daily data in Firebase and local state');
          setTodayData(newDailyData);
        }
      } else {
        console.log('📝 No data exists for today, creating new document');
        const newDailyData: DailyData = {
          activities: [],
          totalConsumed: 0,
          totalBurned: 0,
          netCalories: 0,
          deficitToTarget: targetCalories,
          date: todayKey
        };
        await setDoc(docRef, newDailyData);
        console.log('✨ Initialized new daily data in Firebase and local state');
        setTodayData(newDailyData);
      }
    } catch (err) {
      console.error('❌ Error loading today data:', err);
      if (err instanceof Error) {
        const firebaseError = err as any;
        console.error('Error details:', {
          message: err.message,
          name: err.name,
          code: firebaseError.code
        });
      }
    }
  };

  const handleEdit = async (activity: Activity) => {
    console.log('✏️ Editing activity:', activity);
    setEditActivity(activity);
    setEditName(activity.name);
    setEditCalories(activity.type === 'burn' ? `-${activity.calories}` : activity.calories.toString());
    setIsBurn(activity.type === 'burn');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editActivity) return;

    try {
      const caloriesValue = parseInt(editCalories);
      const updatedActivity: Activity = {
        ...editActivity,
        name: editName,
        calories: Math.abs(caloriesValue),
        type: caloriesValue < 0 ? 'burn' : 'consume'
      };

      const updatedActivities = todayData.activities.map(activity =>
        activity.id === editActivity.id ? updatedActivity : activity
      );

      setTodayData({
        ...todayData,
        activities: updatedActivities
      });
      setEditActivity(null);
      setEditName('');
      setEditCalories('');
      await syncWithFirebase(updatedActivities, todayData.date);
    } catch (error) {
      console.error('Error updating activity:', error);
      setError('Failed to update activity');
    }
  };

  const handleDelete = async (activityId: string) => {
    if (!user) return;
    
    try {
      console.log('🗑️ Starting activity deletion');
      const today = new Date(dbKey);
      const todayKey = today.toISOString().split('T')[0];

      // Remove the activity and recalculate all totals
      const updatedActivities = todayData.activities.filter(a => a.id !== activityId);
      console.log('📦 Activities after deletion:', updatedActivities);
      await syncWithFirebase(updatedActivities, todayKey);
      console.log('✅ Deletion completed successfully');
    } catch (err) {
      console.error('❌ Error deleting activity:', err);
      setError('Failed to delete activity');
    }
  };

  const handleActivityAdd = async (activityData: Omit<Activity, 'id' | 'timestamp'>) => {
    if (!user) return;

    try {
      console.log('➕ Starting new activity addition');
      const today = new Date(dbKey);
      const todayKey = today.toISOString().split('T')[0];

      const newActivity: Activity = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...activityData,
        timestamp: Timestamp.now()
      };

      console.log('📦 New activity to add:', newActivity);
      // Add new activity and recalculate all totals
      const updatedActivities = [...todayData.activities, newActivity];
      await syncWithFirebase(updatedActivities, todayKey);
      console.log('✅ Activity addition completed successfully');
    } catch (err) {
      console.error('❌ Error adding activity:', err);
      setError('Failed to add activity');
    }
  };

  // Add effect to recalculate when target calories change
  useEffect(() => {
    if (user && todayData.activities.length > 0) {
      const today = new Date(dbKey);
      const todayKey = today.toISOString().split('T')[0];
      syncWithFirebase(todayData.activities, todayKey);
    }
  }, [targetCalories]);

  return (
    <div className="container">
      <div className="persistent-header">
        <div className="header-summary">
          <div className="summary-main">
            <h3 className="date-display">{formattedDate}</h3>
            <span className={`net-calories ${todayData.netCalories < targetCalories ? 'below-target' : 'above-target'}`}>
              {todayData.netCalories} / {targetCalories} kcal
            </span>
          </div>
          <div className="summary-details">
            <div
              className="summary-detail-row consumed"
              onClick={() => setConsumedExpanded(prev => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setConsumedExpanded(prev => !prev); } }}
              aria-expanded={consumedExpanded}
            >
              <span className="detail-label">Consumed:</span>
              <span className="detail-value">+{todayData.totalConsumed} kcal</span>
              <span className={`detail-chevron ${consumedExpanded ? 'expanded' : ''}`} aria-hidden>▼</span>
            </div>
            {consumedExpanded && (
              <ul className="collapsible-activity-list">
                {[...todayData.activities]
                  .filter(a => a.type === 'consume')
                  .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
                  .map((activity) => (
                    <li key={activity.id} className="activity-item" onClick={(e) => e.stopPropagation()}>
                      <div className="activity-info">
                        <div className="activity-details">
                          {editActivity?.id === activity.id ? (
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="edit-input" placeholder="Activity name" required autoFocus />
                          ) : (
                            <span className="activity-name">{activity.name || 'Unnamed Activity'}</span>
                          )}
                          <span className="activity-time">
                            {new Date(activity.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {editActivity?.id === activity.id ? (
                          <input type="number" value={editCalories} onChange={(e) => { const v = e.target.value; if (v === '' || /^-?\d*$/.test(v)) setEditCalories(v); }} className="edit-input" placeholder="Calories" required />
                        ) : (
                          <span className="calorie-value consumed">+{activity.calories || 0} cal</span>
                        )}
                      </div>
                      <div className="activity-actions">
                        {editActivity?.id === activity.id ? (
                          <>
                            <button type="button" className="submit-button" onClick={handleEditSubmit} title="Save"><i className="material-icons">check</i></button>
                            <button type="button" className="cancel-button" onClick={() => setEditActivity(null)} title="Cancel"><i className="material-icons">close</i></button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="edit-button" onClick={() => handleEdit(activity)} title="Edit"><i className="material-icons">edit</i></button>
                            <button type="button" className="delete-button" onClick={() => handleDelete(activity.id)} title="Delete"><i className="material-icons">delete</i></button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            {consumedExpanded && todayData.activities.filter(a => a.type === 'consume').length === 0 && (
              <p className="collapsible-empty">No items consumed today</p>
            )}
            <div
              className="summary-detail-row burned"
              onClick={() => setBurnedExpanded(prev => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBurnedExpanded(prev => !prev); } }}
              aria-expanded={burnedExpanded}
            >
              <span className="detail-label">Burned:</span>
              <span className="detail-value">-{todayData.totalBurned} kcal</span>
              <span className={`detail-chevron ${burnedExpanded ? 'expanded' : ''}`} aria-hidden>▼</span>
            </div>
            {burnedExpanded && (
              <ul className="collapsible-activity-list">
                {[...todayData.activities]
                  .filter(a => a.type === 'burn')
                  .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds)
                  .map((activity) => (
                    <li key={activity.id} className="activity-item" onClick={(e) => e.stopPropagation()}>
                      <div className="activity-info">
                        <div className="activity-details">
                          {editActivity?.id === activity.id ? (
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="edit-input" placeholder="Activity name" required autoFocus />
                          ) : (
                            <span className="activity-name">{activity.name || 'Unnamed Activity'}</span>
                          )}
                          <span className="activity-time">
                            {new Date(activity.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {editActivity?.id === activity.id ? (
                          <input type="number" value={editCalories} onChange={(e) => { const v = e.target.value; if (v === '' || /^-?\d*$/.test(v)) setEditCalories(v); }} className="edit-input" placeholder="Calories" required />
                        ) : (
                          <span className="calorie-value burned">-{activity.calories || 0} cal</span>
                        )}
                      </div>
                      <div className="activity-actions">
                        {editActivity?.id === activity.id ? (
                          <>
                            <button type="button" className="submit-button" onClick={handleEditSubmit} title="Save"><i className="material-icons">check</i></button>
                            <button type="button" className="cancel-button" onClick={() => setEditActivity(null)} title="Cancel"><i className="material-icons">close</i></button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="edit-button" onClick={() => handleEdit(activity)} title="Edit"><i className="material-icons">edit</i></button>
                            <button type="button" className="delete-button" onClick={() => handleDelete(activity.id)} title="Delete"><i className="material-icons">delete</i></button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            {burnedExpanded && todayData.activities.filter(a => a.type === 'burn').length === 0 && (
              <p className="collapsible-empty">No items burned today</p>
            )}
          </div>
        </div>
      </div>
      
      {error && <div className="error">{error}</div>}

      <section className="assistant-section" aria-label="Calorie assistant">
        <header className="assistant-header">
          <h4 className="assistant-title">Assistant</h4>
          <p className="assistant-subtitle">
            Tell me what you ate or what exercise you did, and I&apos;ll log it for you.
          </p>
        </header>

        <div className="chat-section">
          <ChatInput 
            onActivityAdd={handleActivityAdd}
            onActivityDelete={handleDelete}
            onActivityEdit={handleEdit}
            currentStats={{
              netCalories: todayData.netCalories,
              consumedCalories: todayData.totalConsumed,
              burnedCalories: todayData.totalBurned,
              targetCalories
            }}
            activities={todayData.activities}
          />
        </div>
      </section>

    </div>
  );
} 