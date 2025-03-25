import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addDailyLog() {
  try {
    const userId = '5RrFKNyb1DZ68RC8cbF5oF5aG8B3';
    const date = '2025-03-22';

    const dailyLogData = {
      date: date,
      activities: [
        {
          name: 'Pizza',
          calories: 300,
          type: 'consumed'
        },
        {
          name: 'Run',
          calories: 150,
          type: 'burned'
        }
      ],
      totalConsumed: 300,
      totalBurned: 150,
      netCalories: 150
    };

    const docRef = doc(db, 'users', userId, 'dailyLogs', date);
    await setDoc(docRef, dailyLogData);

    console.log('Successfully added daily log for March 22nd, 2025');
    console.log('Data:', dailyLogData);

  } catch (error) {
    console.error('Error adding daily log:', error);
  }
}

addDailyLog(); 