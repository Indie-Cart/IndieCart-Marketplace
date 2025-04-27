import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Layout from "./components/Layout";
import HomePage from "./HomePage";
import AboutPage from "./AboutPage";
import AddProduct from "./AddProduct";
import ProductsPage from "./ProductsPage";
import ProductDetailsPage from './ProductDetailsPage';
import SellerShopPage from './SellerShopPage';
import "./App.css";

function App() {
  const { isAuthenticated, user } = useAuth0();

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/seller/:shopName" element={<SellerShopPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;