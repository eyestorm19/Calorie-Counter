import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [targetCalories, setTargetCalories] = useState('2000');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signUp, signInWithGoogle, isNewUser } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if user is newly created
  useEffect(() => {
    if (isNewUser) {
      navigate('/profile');
    }
  }, [isNewUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const { user } = await signUp(email, password);
      
      // Get user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Create user profile
      const userProfile: UserProfile = {
        name,
        email,
        targetCalories: parseInt(targetCalories),
        timezone,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      // Redirection is handled by the useEffect hook that checks isNewUser
    } catch (err) {
      setError('Failed to create an account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setGoogleLoading(true);
      await signInWithGoogle();
      // Redirection is handled by the useEffect hook that checks isNewUser
    } catch (err) {
      setError('Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Create Account</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="targetCalories">Daily Target Calories</label>
          <input
            type="number"
            id="targetCalories"
            value={targetCalories}
            onChange={(e) => setTargetCalories(e.target.value)}
            placeholder="Enter target calories"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
      
      <div className="auth-divider">
        <span>OR</span>
      </div>
      
      <button 
        type="button" 
        className="google-sign-in-button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        <span className="google-icon"></span>
        {googleLoading ? 'Signing in...' : 'Sign up with Google'}
      </button>
      
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
} 