import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './ShippingPage.css';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function ShippingPage() {
    const navigate = useNavigate();
    const { user } = useAuth0();
    const [formData, setFormData] = useState({
        shipping_address: '',
        suburb: '',
        city: '',
        province: '',
        postal_code: '',
        name: '',
        number: ''
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchShippingDetails();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchShippingDetails = async () => {
        try {
            const response = await fetch(`${API_URL}/api/buyers/details`, {
                headers: {
                    'x-user-id': user.sub
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch shipping details');
            }

            const data = await response.json();
            if (data) {
                setFormData({
                    shipping_address: data.shipping_address || '',
                    suburb: data.suburb || '',
                    city: data.city || '',
                    province: data.province || '',
                    postal_code: data.postal_code || '',
                    name: data.name || '',
                    number: data.number || ''
                });
            }
        } catch (err) {
            console.error('Error fetching shipping details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/buyers/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.sub
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to update shipping details');
            }

            // Navigate to payment page
            navigate('/checkout');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return <div className="loading">Loading shipping details...</div>;
    }

    return (
        <main className="shipping-page">
            <section className="container">
                <h1>Shipping Details</h1>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit} className="shipping-form">
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="number">Phone Number</label>
                        <input
                            type="tel"
                            id="number"
                            name="number"
                            value={formData.number}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="shipping_address">Street Address</label>
                        <input
                            type="text"
                            id="shipping_address"
                            name="shipping_address"
                            value={formData.shipping_address}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="suburb">Suburb</label>
                        <input
                            type="text"
                            id="suburb"
                            name="suburb"
                            value={formData.suburb}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="city">City</label>
                        <input
                            type="text"
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="province">Province</label>
                        <input
                            type="text"
                            id="province"
                            name="province"
                            value={formData.province}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="postal_code">Postal Code</label>
                        <input
                            type="text"
                            id="postal_code"
                            name="postal_code"
                            value={formData.postal_code}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="submit-btn">
                        Proceed to Payment
                    </button>
                </form>
            </section>
        </main>
    );
}

export default ShippingPage; 