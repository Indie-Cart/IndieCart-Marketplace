import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ProductsPage.css';

// Determine API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080' 
  : 'https://indiecart-dwgnhtdnh9fvashy.eastus-01.azurewebsites.net';

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <main className="products-page">
      <section className="container">
        <h1>All Products</h1>
        <section className="product-grid">
          {products.map(product => (
            <article key={product.product_id} className="product-card">
              <figure className="product-image">
                {product.image ? (
                  <img src={product.image} alt={product.title} />
                ) : (
                  <div className="no-image">No Image Available</div>
                )}
                <figcaption className="product-overlay">
                  <Link to={`/products/${product.product_id}`} className="view-details-btn">
                    View Details
                  </Link>
                </figcaption>
              </figure>
              <section className="product-info">
                <h3>{product.title}</h3>
                <p className="creator">by {product.shop_name || 'Unknown Shop'}</p>
                <section className="product-meta">
                  <span className="price">${product.price}</span>
                  <span className="stock">Stock: {product.stock}</span>
                </section>
              </section>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

export default ProductsPage; 