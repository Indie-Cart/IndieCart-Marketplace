import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import './ApplySellerPage.css';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecart-dwgnhtdnh9fvashy.eastus-01.azurewebsites.net';

function ApplySellerPage() {
  const { isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isAuthenticated || !user) {
      setError('Please log in to apply as a seller');
      return;
    }

    if (!shopName.trim()) {
      setError('Please enter a shop name');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/sellers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seller_id: user.sub,
          shop_name: shopName.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register as seller');
      }

      setSuccess('Successfully registered as a seller!');
      setTimeout(() => {
        navigate('/products');
      }, 2000);
    } catch (error) {
      console.error('Error registering as seller:', error);
      setError('Failed to register as seller. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="apply-seller-page">
        <div className="container">
          <h2>Please log in to apply as a seller</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="apply-seller-page">
      <div className="container">
        <h2>Apply to be a Seller</h2>
        <form onSubmit={handleSubmit} className="seller-form">
          <div className="form-group">
            <label htmlFor="shopName">Shop Name</label>
            <input
              type="text"
              id="shopName"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Enter your shop name"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button type="submit" className="submit-btn">Apply Now</button>
        </form>
      </div>
    </div>
  );
}

export default ApplySellerPage; 