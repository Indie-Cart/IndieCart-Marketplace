import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ProductDetailsPage.css';

// Determine API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080' 
  : 'https://indiecart-dwgnhtdnh9fvashy.eastus-01.azurewebsites.net';

function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products/${productId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product details');
        }
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) return <div className="loading">Loading product details...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!product) return <div className="error">Product not found</div>;

  return (
    <main className="product-details-page">
      <section className="container">
        <article className="product-details">
          <figure className="product-image">
            {product.image ? (
              <img src={product.image} alt={product.title} />
            ) : (
              <div className="no-image">No Image Available</div>
            )}
          </figure>
          <section className="product-info">
            <h1>{product.title}</h1>
            <p className="creator">
              by{' '}
              <Link 
                to={`/seller/${encodeURIComponent(product.shop_name || 'Unknown Shop')}`}
                className="seller-link"
              >
                {product.shop_name || 'Unknown Shop'}
              </Link>
            </p>
            <p className="description">{product.description}</p>
            <section className="product-meta">
              <span className="price">${product.price}</span>
              <span className="stock">Stock: {product.stock}</span>
            </section>
            <button className="add-to-cart-btn">Add to Cart</button>
          </section>
        </article>
      </section>
    </main>
  );
}

export default ProductDetailsPage; 