import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="container">
      <div className="hero">
        <h1>Welcome to Calorie Tracker</h1>
        <p className="hero-text">
          Track your daily calories, maintain a healthy lifestyle, and achieve your fitness goals!
        </p>
      </div>

      {user ? (
        <div className="dashboard">
          <div className="card">
            <h2>Quick Actions</h2>
            <div className="actions">
              <Link to="/track" className="button">
                Track Calories
              </Link>
              <Link to="/profile" className="button">
                View Profile
              </Link>
              <button onClick={() => useAuth().logout()} className="button">
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="auth-cards">
          <div className="card">
            <h2>Get Started</h2>
            <p>Create an account to start tracking your calories and achieve your fitness goals.</p>
            <div className="actions">
              <Link to="/register" className="button">
                Register Now
              </Link>
            </div>
          </div>
          <div className="card">
            <h2>Already Have an Account?</h2>
            <p>Sign in to continue tracking your progress.</p>
            <div className="actions">
              <Link to="/login" className="button">
                Login
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="features">
        <div className="card">
          <h2>Features</h2>
          <ul className="feature-list">
            <li>Track daily calorie intake and burn</li>
            <li>Set and monitor daily calorie goals</li>
            <li>View your progress over time</li>
            <li>Simple and intuitive interface</li>
            <li>Mobile-friendly design</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 