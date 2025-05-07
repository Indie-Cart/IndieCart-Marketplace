import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './CartPage.css';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingItems, setUpdatingItems] = useState({});
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCartItems();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchCartItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        headers: {
          'x-user-id': user.sub
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch cart items');
      const data = await response.json();
      setCartItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    setUpdatingItems(prev => ({ ...prev, [productId]: true }));
    try {
      const response = await fetch(`${API_URL}/api/cart/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.sub
        },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity: newQuantity }),
      });
      if (!response.ok) throw new Error('Failed to update quantity');
      await fetchCartItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingItems(prev => ({ ...prev, [productId]: false }));
    }
  };

  const removeItem = async (productId) => {
    setUpdatingItems(prev => ({ ...prev, [productId]: true }));
    try {
      const response = await fetch(`${API_URL}/api/cart/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.sub
        },
        credentials: 'include',
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) throw new Error('Failed to remove item');
      await fetchCartItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingItems(prev => ({ ...prev, [productId]: false }));
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  if (!isAuthenticated) {
    return (
      <main className="cart-page">
        <section className="container">
          <h1>Your Cart</h1>
          <p className="empty-cart">Please log in to view your cart</p>
        </section>
      </main>
    );
  }

  if (loading) return <div className="loading">Loading cart...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <main className="cart-page">
      <section className="container">
        <h1>Your Cart</h1>
        {cartItems.length === 0 ? (
          <p className="empty-cart">Your cart is empty</p>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.product_id} className="cart-item">
                  <img src={item.image} alt={item.title} className="item-image" />
                  <div className="item-details">
                    <h3>{item.title}</h3>
                    <p className="price">R{item.price}</p>
                    <div className="quantity-controls">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || updatingItems[item.product_id]}
                        className={updatingItems[item.product_id] ? 'loading' : ''}
                      >
                        {updatingItems[item.product_id] ? (
                          <div className="spinner"></div>
                        ) : (
                          '-'
                        )}
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock || updatingItems[item.product_id]}
                        className={updatingItems[item.product_id] ? 'loading' : ''}
                      >
                        {updatingItems[item.product_id] ? (
                          <div className="spinner"></div>
                        ) : (
                          '+'
                        )}
                      </button>
                    </div>
                    <button
                      className={`remove-btn ${updatingItems[item.product_id] ? 'loading' : ''}`}
                      onClick={() => removeItem(item.product_id)}
                      disabled={updatingItems[item.product_id]}
                    >
                      {updatingItems[item.product_id] ? (
                        <div className="spinner"></div>
                      ) : (
                        'Remove'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <h3>Total: R{calculateTotal().toFixed(2)}</h3>
              <button
                className="checkout-btn"
                onClick={() => navigate('/shipping')}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default CartPage; 