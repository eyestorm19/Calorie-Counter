import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../serviceAccountKey.json'), 'utf-8')
);

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteDailyLog() {
  try {
    const userId = '5RrFKNyb1DZ68RC8cbF5oF5aG8B3';
    const date = '2024-03-22';

    const docRef = db.collection('users').doc(userId).collection('dailyLogs').doc(date);
    
    await docRef.delete();

    console.log('Successfully deleted daily log for March 22nd, 2024');

  } catch (error) {
    console.error('Error deleting daily log:', error);
  }
}

deleteDailyLog(); 