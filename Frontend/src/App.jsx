import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Layout from "./components/Layout";
import HomePage from "./HomePage";
import AboutPage from "./AboutPage";
import AddProduct from "./AddProduct";
import ProductsPage from "./ProductsPage";
import ProductDetailsPage from './ProductDetailsPage';
import SellerShopPage from './SellerShopPage';
import ApplySellerPage from './ApplySellerPage';
import SellerDashboard from './SellerDashboard';
import EditProduct from './EditProduct';
import CartPage from './CartPage';
import ShippingPage from './ShippingPage';
import CheckoutPage from './CheckoutPage';
import MyAccountPage from './MyAccountPage';
import "./App.css";
import axios from 'axios';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth0();

  useEffect(() => {
    // Check for payment success in URL
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success' && isAuthenticated && user) {
      // Call backend to mark order as paid
      axios.post('/api/payment/success', {}, {
        headers: { 'x-user-id': user.sub }
      })
        .then(() => {
          alert('Payment successful! Thank you for your purchase.');
          // Navigate to MyAccountPage
          navigate('/my-account');
        })
        .catch(() => {
          alert('Payment was successful, but there was an issue updating your order.');
          // Navigate to MyAccountPage even if there's an error
          navigate('/my-account');
        })
        .finally(() => {
          // Clear the URL parameter
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [location, isAuthenticated, user, navigate]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/add-product" element={<AddProduct />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:productId" element={<ProductDetailsPage />} />
        <Route path="/seller/:shopName" element={<SellerShopPage />} />
        <Route path="/apply-seller" element={<ApplySellerPage />} />
        <Route path="/seller-dashboard" element={<SellerDashboard />} />
        <Route path="/edit-product/:productId" element={<EditProduct />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/shipping" element={<ShippingPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/my-account" element={<MyAccountPage />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;