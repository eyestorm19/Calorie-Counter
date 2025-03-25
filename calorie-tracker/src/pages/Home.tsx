import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
  const appMode = import.meta.env.VITE_APP_MODE || 'production';

  return (
    <div className="app">
      <div className="hero"></div>
      <div className="hero-content">
        <h1>Transform Your Health Journey with Apollo</h1>
        <p className="hero-text">
          The most intuitive and powerful calorie tracking app that helps you achieve your fitness goals with precision and ease.
        </p>
        <div className="actions">
          {user ? (
            <Link to="/track" className="button">Start Tracking</Link>
          ) : (
            <>
              <Link to="/login" className="button">Login</Link>
              <Link to="/register" className="button">Create Account</Link>
            </>
          )}
        </div>
      </div>
      <main>
        <div className="container">
          <div className="features">
            <h2>Why Choose Apollo?</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <h3>Smart Tracking</h3>
                <p>Track calories with AI-powered suggestions and automatic calculations. Our intelligent system learns your habits and makes tracking effortless.</p>
              </div>
              <div className="feature-card">
                <h3>Real-Time Insights</h3>
                <p>Get instant feedback on your progress with beautiful charts and detailed analytics. Make informed decisions about your nutrition every day.</p>
              </div>
              <div className="feature-card">
                <h3>Personalized Goals</h3>
                <p>Set custom calorie targets based on your unique needs. Whether you're looking to lose, maintain, or gain weight, we've got you covered.</p>
              </div>
              <div className="feature-card">
                <h3>Progress Tracking</h3>
                <p>Watch your progress unfold with weekly summaries and trend analysis. Stay motivated with visual representations of your achievements.</p>
              </div>
            </div>
          </div>
          <div className="benefits">
            <h2>Start Your Journey Today</h2>
            <div className="benefit-list">
              <div className="benefit-item">
                <span className="benefit-number">1</span>
                <div className="benefit-content">
                  <h3>Join Thousands of Success Stories</h3>
                  <p>Be part of a community of health-conscious individuals who have achieved their goals with Apollo.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-number">2</span>
                <div className="benefit-content">
                  <h3>Free to Get Started</h3>
                  <p>No hidden fees or premium features. Everything you need to track your calories effectively is available right away.</p>
                </div>
              </div>
              <div className="benefit-item">
                <span className="benefit-number">3</span>
                <div className="benefit-content">
                  <h3>Secure & Private</h3>
                  <p>Your data is encrypted and secure. We respect your privacy and never share your information with third parties.</p>
                </div>
              </div>
            </div>
            <div className="cta-section">
              <h2>Ready to Transform Your Health?</h2>
              <p>Join Apollo today and take the first step towards your fitness goals.</p>
              <div className="actions">
                {user ? (
                  <Link to="/track" className="button">Continue Your Journey</Link>
                ) : (
                  <Link to="/register" className="button">Get Started</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="app-footer">
        <p>Version {appVersion} - {appMode} mode</p>
      </footer>
    </div>
  );
};

export default Home; 