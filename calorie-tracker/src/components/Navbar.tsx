import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Calorie Tracker</Link>
      </div>
      <div className="navbar-menu">
        <div className="navbar-end">
          <Link 
            to="/track" 
            className={`navbar-item ${isActive('/track') ? 'active' : ''}`}
          >
            Track
          </Link>
          <Link 
            to="/profile" 
            className={`navbar-item ${isActive('/profile') ? 'active' : ''}`}
          >
            Profile
          </Link>
          <button onClick={logout} className="navbar-item logout-button">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
} 