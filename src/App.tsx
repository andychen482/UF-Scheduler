import "./App.css";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Main from "./pages/Main/Main";
import AboutPage from "./pages/About/About";

function App() {
  return (
    <Router>
      <Routes>
      <Route path="" element={<Main />} />
      <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Router>
  );
}

export default App;