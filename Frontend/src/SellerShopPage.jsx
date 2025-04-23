import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ProductsPage.css'; // Reusing the same styles

// Determine API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080' 
  : 'https://indiecart-dwgnhtdnh9fvashy.eastus-01.azurewebsites.net';

function SellerShopPage() {
  const { shopName } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSellerProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products/seller/${encodeURIComponent(shopName)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch seller products');
        }
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerProducts();
  }, [shopName]);

  if (loading) return <div className="loading">Loading seller's products...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <main className="products-page">
      <section className="container">
        <h1>{shopName}'s Shop</h1>
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

export default SellerShopPage; 