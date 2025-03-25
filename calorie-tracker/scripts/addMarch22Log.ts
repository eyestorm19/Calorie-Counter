import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-admin-key.json', 'utf-8'));
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function addDailyLog() {
  try {
    const userId = '5RrFKNyb1DZ68RC8cbF5oF5aG8B3';
    const date = '2025-03-22';

    const dailyLogData = {
      date: date,
      activities: [
        {
          name: 'Oatmeal',
          calories: Number(350),
          type: 'consumed',
          timestamp: Timestamp.fromDate(new Date(`${date}T08:30:00`))
        },
        {
          name: 'Sandwich',
          calories: Number(550),
          type: 'consumed',
          timestamp: Timestamp.fromDate(new Date(`${date}T12:30:00`))
        },
        {
          name: 'Pizza',
          calories: Number(800),
          type: 'consumed',
          timestamp: Timestamp.fromDate(new Date(`${date}T19:30:00`))
        },
        {
          name: 'Cycling',
          calories: Number(400),
          type: 'burned',
          timestamp: Timestamp.fromDate(new Date(`${date}T09:00:00`))
        },
        {
          name: 'Swimming',
          calories: Number(300),
          type: 'burned',
          timestamp: Timestamp.fromDate(new Date(`${date}T16:00:00`))
        }
      ],
      totalConsumed: Number(1700),
      totalBurned: Number(700),
      netCalories: Number(1000)
    };

    const docRef = db.collection('users').doc(userId).collection('dailyLogs').doc(date);
    await docRef.set(dailyLogData);

    console.log('Successfully added daily log for March 22nd, 2025');
    console.log('Data:', dailyLogData);

  } catch (error) {
    console.error('Error adding daily log:', error);
  }
}

addDailyLog(); 