import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import ReactGA from 'react-ga4';
import 'react-tooltip/dist/react-tooltip.css'
import { AuthProvider } from 'react-oidc-context';
import { cognitoConfig } from './config/api';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
ReactGA.initialize(process.env.REACT_APP_GA_TOKEN as string);
root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

type WebVitalMetric = {
  id: string;
  name: string;
  value: number;
};

const sendToGoogleAnalytics = (metric: WebVitalMetric) => {
  const { id, name, value } = metric;

  ReactGA.send({
    hitType: 'event',
    eventCategory: 'Web Vitals',
    eventAction: name,
    eventLabel: id,
    eventValue: Math.round(name === 'CLS' ? value * 1000 : value),
  });
};

reportWebVitals(sendToGoogleAnalytics);