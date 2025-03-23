import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCui1P_IK9fYQe9bRQrGsYqAQB-G04OUno",
    authDomain: "apollo-7e76b.firebaseapp.com",
    projectId: "apollo-7e76b",
    storageBucket: "apollo-7e76b.firebasestorage.app",
    messagingSenderId: "860333214181",
    appId: "1:860333214181:web:7598bf93e194c71ffdc70c"
  };
  

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);