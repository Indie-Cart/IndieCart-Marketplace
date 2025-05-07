import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import './SellerDashboard.css';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function SellerDashboard() {
  const { isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();
  const [sellerInfo, setSellerInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSellerData = async () => {
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
      } catch (error) {
        console.error('Error fetching seller data:', error);
        setError('Failed to load seller dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [isAuthenticated, user, navigate]);

  if (loading) {
    return <div className="seller-dashboard loading">Loading...</div>;
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

        <section className="product-grid">
          {products.length === 0 ? (
            <p className="no-products">You haven't added any products yet.</p>
          ) : (
            products.map(product => (
              <article key={product.product_id} className="product-card">
                <figure className="product-image">
                  {product.image ? (
                    <img src={product.image} alt={product.title} />
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