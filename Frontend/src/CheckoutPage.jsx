import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './CheckoutPage.css';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function CheckoutPage() {
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth0();

    useEffect(() => {
        if (isAuthenticated) {
            fetchCartTotal();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const fetchCartTotal = async () => {
        try {
            const response = await fetch(`${API_URL}/api/cart`, {
                headers: {
                    'x-user-id': user.sub
                },
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch cart total');
            const data = await response.json();
            const total = data.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            setTotal(total);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        try {
            const response = await fetch(`${API_URL}/api/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.sub
                },
                credentials: 'include',
                body: JSON.stringify({
                    amount: Math.round(total * 100) // Convert to cents for Stripe
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create checkout');
            }

            const data = await response.json();
            window.location.href = data.redirectUrl;
        } catch (err) {
            setError(err.message);
        }
    };

    if (!isAuthenticated) {
        return (
            <main className="checkout-page">
                <section className="container">
                    <h1>Checkout</h1>
                    <p className="error">Please log in to proceed to payment</p>
                </section>
            </main>
        );
    }

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <main className="checkout-page">
            <section className="container">
                <h1>Payment</h1>
                <div className="checkout-summary">
                    <h3>Total: R{total.toFixed(2)}</h3>
                    <button
                        className="payment-btn"
                        onClick={handlePayment}
                    >
                        Pay with Card
                    </button>
                </div>
            </section>
        </main>
    );
}

export default CheckoutPage; 