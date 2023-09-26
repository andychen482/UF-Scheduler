import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Main from "./pages/Main/Main";
import AboutPage from "./pages/About/About";
import Fourohfour from './pages/404/404';

function App() {
  return (
    <Routes>
      <Route path="" element={<Main />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<Fourohfour />} />
    </Routes>
  );
}

export default App;