import { useEffect } from 'react';
import './App.css';
import { Routes, Route, useLocation } from 'react-router-dom';
import Main from "./pages/Main/Main";
import AboutPage from "./pages/About/About";
import Fourohfour from './pages/404/404';
import Privacy from './pages/Privacy Policy/PrivacyPolicy';
import ReactGA from 'react-ga4';

function App() {
  const location = useLocation();

  useEffect(() => {
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
      <Route path="*" element={<Fourohfour />} />
    </Routes>
  );
}

export default App;
