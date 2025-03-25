import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert('./firebase-admin-key.json')
});

const db = getFirestore();

async function addMarchData() {
  const userId = '5RrFKNyb1DZ68RC8cbF5oF5aG8B3';
  const date = '2024-03-22';
  
  try {
    // Create timestamps for 11 AM and 2 PM on March 22
    const timestamp1 = Timestamp.fromDate(new Date('2024-03-22T11:00:00'));
    const timestamp2 = Timestamp.fromDate(new Date('2024-03-22T14:00:00'));

    const dailyData = {
      activities: [
        {
          id: Date.parse('2024-03-22T11:00:00').toString(),
          name: "pizza",
          type: "consume",
          calories: 600,
          timestamp: timestamp1
        },
        {
          id: Date.parse('2024-03-22T14:00:00').toString(),
          name: "5K run",
          type: "burn",
          calories: 300,
          timestamp: timestamp2
        }
      ],
      totalConsumed: 600,
      totalBurned: 300,
      netCalories: 300,
      deficitToTarget: 1700,
      date: date
    };

    // Add the document to Firestore
    const docRef = db.doc(`users/${userId}/dailyLogs/${date}`);
    await docRef.set(dailyData);
    
    console.log('Successfully added March 22nd data!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding data:', error);
    process.exit(1);
  }
}

addMarchData(); 