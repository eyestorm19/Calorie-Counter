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
    const date = '2025-03-23';

    const dailyLogData = {
      date: date,
      activities: [
        {
          name: 'Breakfast',
          calories: Number(450),
          type: 'consumed',
          timestamp: Timestamp.fromDate(new Date(`${date}T08:00:00`))
        },
        {
          name: 'Lunch',
          calories: Number(650),
          type: 'consumed',
          timestamp: Timestamp.fromDate(new Date(`${date}T12:00:00`))
        },
        {
          name: 'Dinner',
          calories: Number(800),
          type: 'consumed',
          timestamp: Timestamp.fromDate(new Date(`${date}T19:00:00`))
        },
        {
          name: 'Morning Run',
          calories: Number(300),
          type: 'burned',
          timestamp: Timestamp.fromDate(new Date(`${date}T07:00:00`))
        },
        {
          name: 'Evening Walk',
          calories: Number(150),
          type: 'burned',
          timestamp: Timestamp.fromDate(new Date(`${date}T18:00:00`))
        }
      ],
      totalConsumed: Number(1900),
      totalBurned: Number(450),
      netCalories: Number(1450)
    };

    const docRef = db.collection('users').doc(userId).collection('dailyLogs').doc(date);
    await docRef.set(dailyLogData);

    console.log('Successfully added daily log for March 23rd, 2025');
    console.log('Data:', dailyLogData);

  } catch (error) {
    console.error('Error adding daily log:', error);
  }
}

addDailyLog(); 