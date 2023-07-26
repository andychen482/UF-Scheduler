import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Main from "./pages/Main/Main";

function App() {
  return (
    <Routes>
      <Route path="WAS" element={<Main />} />
    </Routes>
  );
}

export default App;
