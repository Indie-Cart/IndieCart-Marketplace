import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import './SellerDashboard.css';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function SellerDashboard() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth0();
  const navigate = useNavigate();
  const [sellerInfo, setSellerInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ordersToShip, setOrdersToShip] = useState([]);
  const [shippingOrderIds, setShippingOrderIds] = useState([]);
  const [shippingOrders, setShippingOrders] = useState([]);
  const [productsToShip, setProductsToShip] = useState([]);
  const [productsShipping, setProductsShipping] = useState([]);
  const [markingIds, setMarkingIds] = useState([]);

  useEffect(() => {
    const fetchSellerData = async () => {
      // Don't proceed if Auth0 is still loading
      if (authLoading) {
        return;
      }

      if (!isAuthenticated || !user) {
        setError('Please log in to view seller dashboard');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/seller/check/${user.sub}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setError('You are not registered as a seller');
            navigate('/apply-seller');
          } else {
            throw new Error(data.error || 'Failed to fetch seller data');
          }
          return;
        }

        setSellerInfo(data.sellerInfo);
        setProducts(data.products);

        // Fetch orders to ship
        const ordersRes = await fetch(`${API_URL}/api/seller/orders-to-ship/${user.sub}`);
        const ordersData = await ordersRes.json();
        setOrdersToShip(ordersData);
        // Fetch orders being shipped
        const shippingRes = await fetch(`${API_URL}/api/seller/orders-shipping/${user.sub}`);
        const shippingData = await shippingRes.json();
        setShippingOrders(shippingData);

        const toShipRes = await fetch(`${API_URL}/api/seller/products-to-ship/${user.sub}`);
        setProductsToShip(await toShipRes.json());
        const shippingRes2 = await fetch(`${API_URL}/api/seller/products-shipping/${user.sub}`);
        setProductsShipping(await shippingRes2.json());
      } catch (error) {
        console.error('Error fetching seller data:', error);
        setError('Failed to load seller dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [isAuthenticated, user, navigate, authLoading]);

  const handleMarkShipped = async (orderProductId) => {
    setMarkingIds(prev => [...prev, orderProductId]);
    try {
      const res = await fetch(`${API_URL}/api/seller/mark-product-shipped/${orderProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setProductsToShip(prev => prev.filter(p => p.id !== orderProductId));
        const updated = await res.json();
        setProductsShipping(prev => [...prev, updated.orderProduct]);
      } else {
        alert('Failed to mark as shipped');
      }
    } finally {
      setMarkingIds(prev => prev.filter(id => id !== orderProductId));
    }
  };

  // Show loading state while Auth0 is checking authentication
  if (authLoading) {
    return <div className="seller-dashboard loading">Loading...</div>;
  }

  if (loading) {
    return <div className="seller-dashboard loading">Loading seller data...</div>;
  }

  if (error) {
    return <div className="seller-dashboard error">{error}</div>;
  }

  return (
    <main className="seller-dashboard">
      <div className="container">
        <header className="dashboard-header">
          <h1>Seller Dashboard</h1>
          <div className="seller-info">
            <h2>{sellerInfo.shop_name}</h2>
            <p>Total Products: {sellerInfo.product_count}</p>
          </div>
        </header>

        <section className="actions">
          <button onClick={() => navigate('/add-product')} className="add-product-btn">
            Add New Product
          </button>
        </section>

        <section className="orders-to-ship">
          <h2>Products to Ship</h2>
          {productsToShip.length === 0 ? (
            <p>No products to ship.</p>
          ) : (
            productsToShip.map(product => (
              <div key={product.id} className="order-card">
                <h3>Order #{product.order_id} (Buyer: {product.buyer_id})</h3>
                <ul>
                  <li>
                    <strong>{product.title}</strong> (x{product.quantity})
                  </li>
                </ul>
                <button
                  className="mark-shipped-btn"
                  onClick={() => handleMarkShipped(product.id)}
                  disabled={markingIds.includes(product.id)}
                >
                  {markingIds.includes(product.id) ? 'Marking...' : 'Mark as Shipped'}
                </button>
              </div>
            ))
          )}
        </section>

        <section className="orders-to-ship">
          <h2>Products Being Shipped</h2>
          {productsShipping.length === 0 ? (
            <p>No products are currently being shipped.</p>
          ) : (
            productsShipping.map(product => (
              <div key={product.id} className="order-card">
                <h3>Order #{product.order_id} (Buyer: {product.buyer_id})</h3>
                <ul>
                  <li>
                    <strong>{product.title}</strong> (x{product.quantity})
                  </li>
                </ul>
                <span className="shipping-status">Shipping...</span>
              </div>
            ))
          )}
        </section>

        <section className="product-grid">
          {products.length === 0 ? (
            <p className="no-products">You haven't added any products yet.</p>
          ) : (
            products.map(product => (
              <article key={product.product_id} className="product-card">
                <figure className="product-image">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} />
                  ) : (
                    <div className="no-image">No Image Available</div>
                  )}
                  <figcaption className="product-overlay">
                    <Link to={`/edit-product/${product.product_id}`} className="view-details-btn">
                      Edit Product
                    </Link>
                  </figcaption>
                </figure>
                <section className="product-info">
                  <h3>{product.title}</h3>
                  <section className="product-meta">
                    <span className="price">R{product.price}</span>
                    <span className="stock">Stock: {product.stock}</span>
                  </section>
                </section>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

export default SellerDashboard; 