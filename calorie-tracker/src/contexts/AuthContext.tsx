import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearNewUserFlag: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Create a profile document if signing in with Google for the first time
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists() && user.providerData.some(provider => provider.providerId === 'google.com')) {
          // Create a basic profile with defaults for Google sign-ins
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          
          await setDoc(userDocRef, {
            name: user.displayName || '',
            email: user.email || '',
            targetCalories: 2000, // Default target
            timezone,
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: 'google'
          });
          
          // Set the new user flag
          setIsNewUser(true);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    setIsNewUser(true);
    return result;
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    setIsNewUser(false);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // Note: isNewUser is handled in the onAuthStateChanged event
  };

  const logout = async () => {
    await signOut(auth);
    setIsNewUser(false);
  };
  
  const clearNewUserFlag = () => {
    setIsNewUser(false);
  };

  const value = {
    user,
    loading,
    isNewUser,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    clearNewUserFlag
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 