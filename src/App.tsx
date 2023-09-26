import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Main from "./pages/Main/Main";
import AboutPage from "./pages/About/About";

function App() {
  return (
      <Routes>
        <Route path="" element={<Main />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
  );
}

export default App;
