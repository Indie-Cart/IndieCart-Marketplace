import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './MyAccountPage.css';

// Determine API URL based on environment
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function MyAccountPage() {
    const { user, isAuthenticated } = useAuth0();
    const [buyerInfo, setBuyerInfo] = useState({
        shipping_address: '',
        suburb: '',
        city: '',
        province: '',
        postal_code: '',
        name: '',
        number: ''
    });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editInfo, setEditInfo] = useState({});

    useEffect(() => {
        const fetchUserData = async () => {
            if (!isAuthenticated || !user) return;

            try {
                // Fetch buyer details
                const detailsResponse = await fetch(`${API_URL}/api/buyers/details`, {
                    headers: {
                        'x-user-id': user.sub
                    }
                });

                if (detailsResponse.ok) {
                    const detailsData = await detailsResponse.json();
                    setBuyerInfo(detailsData);
                    setEditInfo(detailsData);
                }

                // Fetch orders
                const ordersResponse = await fetch(`${API_URL}/api/orders`, {
                    headers: {
                        'x-user-id': user.sub
                    }
                });

                if (ordersResponse.ok) {
                    let ordersData = await ordersResponse.json();

                    // If the response is a flat list, group by order_id
                    if (Array.isArray(ordersData) && ordersData.length > 0 && ordersData[0].product_id !== undefined) {
                        const grouped = {};
                        ordersData.forEach(row => {
                            if (!grouped[row.order_id]) {
                                grouped[row.order_id] = {
                                    order_id: row.order_id,
                                    status: row.status,
                                    created_at: row.created_at,
                                    buyer_id: row.buyer_id,
                                    items: [],
                                };
                            }
                            grouped[row.order_id].items.push({
                                product_id: row.product_id,
                                title: row.title,
                                price: row.price,
                                image_url: row.image_url,
                                quantity: row.quantity,
                            });
                        });
                        ordersData = Object.values(grouped);
                    }

                    setOrders(ordersData);
                }
            } catch (err) {
                setError('Failed to load account information');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [isAuthenticated, user]);

    const handleInfoChange = (e) => {
        const { name, value } = e.target;
        setEditInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleInfoSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/buyers/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.sub
                },
                body: JSON.stringify(editInfo),
            });

            if (response.ok) {
                setBuyerInfo(editInfo);
                setIsEditing(false);
            } else {
                throw new Error('Failed to update information');
            }
        } catch (err) {
            setError('Failed to update information');
        }
    };

    if (loading) return <div className="loading">Loading account information...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <main className="my-account-page">
            <section className="container">
                <h1>My Account</h1>

                <div className="account-sections">
                    <section className="address-section">
                        <h2>Personal Information</h2>
                        {isEditing ? (
                            <form onSubmit={handleInfoSubmit} className="address-form">
                                <div className="form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={editInfo.name}
                                        onChange={handleInfoChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="number">Phone Number</label>
                                    <input
                                        type="tel"
                                        id="number"
                                        name="number"
                                        value={editInfo.number}
                                        onChange={handleInfoChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="shipping_address">Street Address</label>
                                    <input
                                        type="text"
                                        id="shipping_address"
                                        name="shipping_address"
                                        value={editInfo.shipping_address}
                                        onChange={handleInfoChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="suburb">Suburb</label>
                                    <input
                                        type="text"
                                        id="suburb"
                                        name="suburb"
                                        value={editInfo.suburb}
                                        onChange={handleInfoChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="city">City</label>
                                    <input
                                        type="text"
                                        id="city"
                                        name="city"
                                        value={editInfo.city}
                                        onChange={handleInfoChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="province">Province</label>
                                    <input
                                        type="text"
                                        id="province"
                                        name="province"
                                        value={editInfo.province}
                                        onChange={handleInfoChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="postal_code">Postal Code</label>
                                    <input
                                        type="text"
                                        id="postal_code"
                                        name="postal_code"
                                        value={editInfo.postal_code}
                                        onChange={handleInfoChange}
                                        required
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="save-btn">Save Changes</button>
                                    <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="address-display">
                                <p><strong>Name:</strong> {buyerInfo.name}</p>
                                <p><strong>Phone:</strong> {buyerInfo.number}</p>
                                <p><strong>Address:</strong> {buyerInfo.shipping_address}</p>
                                <p><strong>Suburb:</strong> {buyerInfo.suburb}</p>
                                <p><strong>City:</strong> {buyerInfo.city}</p>
                                <p><strong>Province:</strong> {buyerInfo.province}</p>
                                <p><strong>Postal Code:</strong> {buyerInfo.postal_code}</p>
                                <button onClick={() => setIsEditing(true)} className="edit-btn">
                                    Edit Information
                                </button>
                            </div>
                        )}
                    </section>

                    <section className="orders-section">
                        <h2>Order History</h2>
                        {orders.length === 0 ? (
                            <p className="no-orders">You haven't placed any orders yet.</p>
                        ) : (
                            <div className="orders-list">
                                {orders.map(order => (
                                    <div key={order.order_id} className="order-card">
                                        <div className="order-header">
                                            <h3>Order #{order.order_id}</h3>
                                            <span className={`order-status ${order.status.toLowerCase()}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="order-details">
                                            <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                                            <p>Total: R{order.total_amount}</p>
                                        </div>
                                        <div className="order-items">
                                            {order.items.map(item => (
                                                <div key={item.product_id} className="order-item">
                                                    <img src={item.image_url} alt={item.title} />
                                                    <div className="item-details">
                                                        <h4>{item.title}</h4>
                                                        <p>Quantity: {item.quantity}</p>
                                                        <p>Price: R{item.price}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </section>
        </main>
    );
}

export default MyAccountPage; 