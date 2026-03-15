import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DateProvider } from './contexts/DateContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import BackgroundElements from './components/BackgroundElements';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Track from './pages/Track';
import Profile from './pages/Profile';
import Help from './pages/Help';

function App() {
  const appMode = import.meta.env.VITE_APP_MODE || 'production';

  return (
    <Router>
      <AuthProvider>
        <DateProvider>
          <div className="app" data-env={appMode}>
            <BackgroundElements />
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/track"
                element={
                  <PrivateRoute>
                    <Track />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/help"
                element={<Help />}
              />
            </Routes>
          </div>
        </DateProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
