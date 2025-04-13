import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import HomePage from "./HomePage";
import AboutPage from "./AboutPage";
import "./App.css";

function App() {
  const { isAuthenticated, user, logout } = useAuth0();

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
        
        {isAuthenticated && (
          <div className="auth-status">
            <h2>Welcome, {user.name}</h2>
            <button onClick={() => logout({ returnTo: window.location.origin })}>
              Log Out
            </button>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;