import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HomePage.css';
import { useAuth0 } from "@auth0/auth0-react";

// Determine API URL based on environment./
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net/';

function HomePage() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products?limit=6`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setFeaturedProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const registerBuyer = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await fetch(`${API_URL}/api/buyers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ buyer_id: user.sub }),
          });

          if (!response.ok) {
            throw new Error('Failed to register buyer');
          }
        } catch (error) {
          console.error('Error registering buyer:', error);
        }
      }
    };

    registerBuyer();
  }, [isAuthenticated, user]);

  return (
    <main className="home-page">
      <section className="hero">
        <section className="container">
          <article className="hero-content">
            <h1>Discover Unique DIY Projects</h1>
            <p>Crafted with heart. Curated for you.</p>
            <section className="cta-buttons">
              <button onClick={() => navigate('/products')} className="primary-btn">Browse Products</button>
              <button onClick={() => navigate('/apply-seller')} className="secondary-btn">Start Selling</button>
            </section>
          </article>
        </section>
      </section>

      <section className="products">
        <section className="container">
          <h2>Featured DIY Projects</h2>
          {loading ? (
            <div className="loading">Loading products...</div>
          ) : (
            <>
              <section className="product-grid">
                {featuredProducts.map(product => (
                  <article key={product.product_id} className="product-card">
                    <figure className="product-image">
                      <img src={product.image_url} alt={product.title} />
                      <figcaption className="product-overlay">
                        <button onClick={() => navigate(`/products/${product.product_id}`)} className="view-details-btn">View Details</button>
                      </figcaption>
                    </figure>
                    <section className="product-info">
                      <h3>{product.title}</h3>
                      <p className="creator">
                        by{' '}
                        <Link
                          to={`/seller/${encodeURIComponent(product.shop_name || 'Unknown Shop')}`}
                          className="seller-link"
                        >
                          {product.shop_name || 'Unknown Shop'}
                        </Link>
                      </p>
                      <section className="product-meta">
                        <span className="price">R{product.price}</span>
                        <span className="stock">Stock: {product.stock}</span>
                        {product.rating && <span className="rating">⭐ {product.rating}</span>}
                      </section>
                    </section>
                  </article>
                ))}
              </section>
              <section className="view-all-container">
                <button onClick={() => navigate('/products')} className="view-all-btn">View All Projects</button>
              </section>
            </>
          )}
        </section>
      </section>

      <section className="features">
        <section className="container">
          <h2>Why Choose IndieCart?</h2>
          <section className="feature-grid">
            <article className="feature-card">
              <span className="feature-icon">🎨</span>
              <h3>Unique Creations</h3>
              <p>Discover one-of-a-kind DIY projects from talented artists worldwide</p>
            </article>
            <article className="feature-card">
              <span className="feature-icon">💡</span>
              <h3>Learn & Create</h3>
              <p>Follow detailed tutorials and create your own masterpieces</p>
            </article>
            <article className="feature-card">
              <span className="feature-icon">🤝</span>
              <h3>Support Artists</h3>
              <p>Directly support independent creators and their craft</p>
            </article>
          </section>
        </section>
      </section>

      <section className="cta-section">
        <section className="container">
          <h2>Ready to Start Your Creative Journey?</h2>
          <p>Join our community of makers and share your unique creations with the world</p>
          <button onClick={() => {
            if (isAuthenticated) {
              navigate('/seller-dashboard');
            } else {
              loginWithRedirect();
            }
          }} className="get-started-btn">Get Started</button>
        </section>
      </section>
    </main>
  );
}

export default HomePage;
