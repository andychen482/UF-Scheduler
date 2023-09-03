import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Main from "./pages/Main/Main";

function App() {
  return (
    <Routes>
      <Route path="" element={<Main />} />
    </Routes>
  );
}

export default App;
