import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ProductsPage.css';

// Determine API URL based on environment
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
        setFilteredProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <main className="products-page">
      <section className="container">
        <h1>All Products</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
        <section className="product-grid">
          {filteredProducts.map(product => (
            <article key={product.product_id} className="product-card">
              <figure className="product-image">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.title} />
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