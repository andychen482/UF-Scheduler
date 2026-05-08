import { useEffect } from 'react';
import './App.css';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Main from "./pages/Main/Main";
import AboutPage from "./pages/About/About";
import Fourohfour from './pages/404/404';
import Privacy from './pages/Privacy Policy/PrivacyPolicy';
import ReactGA from 'react-ga4';
import { useAuth } from 'react-oidc-context';
import { isAnalyticsEnabled } from './analytics';

function CallbackPage() {
  const auth = useAuth();
  if (auth.isAuthenticated) {
    return <Navigate to="/" />;
  }
  return <div style={{ padding: 24, textAlign: "center" }}>Signing in...</div>;
}

function App() {
  const location = useLocation();

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    ReactGA.send({
      hitType: "pageview",
      page: location.pathname,
    });
  }, [location]);

  return (
    <Routes>
      <Route path="" element={<Main />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="*" element={<Fourohfour />} />
    </Routes>
  );
}

export default App;
