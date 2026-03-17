import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const appName = import.meta.env.VITE_APP_NAME || 'Apollo';

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">{appName}</Link>
      </div>
      <div className="navbar-menu">
        <div className="navbar-end">
          {user ? (
            <>
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
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className={`navbar-item ${isActive('/login') ? 'active' : ''}`}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className={`navbar-item ${isActive('/register') ? 'active' : ''}`}
              >
                Register
              </Link>
            </>
          )}
          <Link 
            to="/help" 
            className={`navbar-item ${isActive('/help') ? 'active' : ''}`}
          >
            Help
          </Link>
        </div>
      </div>
    </nav>
  );
} 