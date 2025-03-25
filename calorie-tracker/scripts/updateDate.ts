import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
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

async function updateDate() {
  try {
    const userId = '5RrFKNyb1DZ68RC8cbF5oF5aG8B3'; // Your user ID
    const oldDate = '2025-03-22';
    const newDate = '2024-03-22';

    // Get the old document
    const oldDocRef = doc(db, 'users', userId, 'dailyLogs', oldDate);
    const oldDoc = await getDoc(oldDocRef);

    if (!oldDoc.exists()) {
      console.log('Old document not found');
      return;
    }

    // Create new document with updated date
    const newDocRef = doc(db, 'users', userId, 'dailyLogs', newDate);
    const data = oldDoc.data();
    
    // Update the date in the data
    data.date = newDate;

    // Write to new document
    await updateDoc(newDocRef, data);

    // Delete old document
    // Note: We'll need to use the admin SDK to delete documents
    // For now, we'll just log that it needs to be deleted manually
    console.log('Successfully created new document with date 2024-03-22');
    console.log('Please delete the old document (2025-03-22) manually from Firebase Console');

  } catch (error) {
    console.error('Error updating date:', error);
  }
}

updateDate(); 