import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import HomePage from "./HomePage";
import AboutPage from "./AboutPage";
import AddProduct from "./AddProduct";
import "./App.css";

function App() {
  const { isAuthenticated, user } = useAuth0();

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/add-product" element={<AddProduct />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;