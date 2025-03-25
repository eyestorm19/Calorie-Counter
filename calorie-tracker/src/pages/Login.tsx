import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle, isNewUser, user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect based on user status
  useEffect(() => {
    if (user) {
      if (isNewUser) {
        navigate('/profile');
      } else {
        navigate('/track');
      }
    }
  }, [isNewUser, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
      // Redirection is handled by the useEffect hook
    } catch (err) {
      setError('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setGoogleLoading(true);
      await signInWithGoogle();
      // Redirection is handled by the useEffect hook
    } catch (err) {
      setError('Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome Back</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
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
            placeholder="Enter your password"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
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
        {googleLoading ? 'Signing in...' : 'Sign in with Google'}
      </button>
      
      <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
} 