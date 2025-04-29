import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './ProductDetailsPage.css';

// Determine API URL based on environment
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecart-dwgnhtdnh9fvashy.eastus-01.azurewebsites.net';

function ProductDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

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

  const handleAddToCart = () => {
    if (!product) return;

    // Get existing cart from localStorage
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');

    // Check if product already exists in cart
    const existingItemIndex = existingCart.findIndex(item => item.id === product.id);

    if (existingItemIndex >= 0) {
      // Update quantity if product exists
      existingCart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      existingCart.push({
        id: product.id,
        name: product.title,
        price: product.price,
        image: product.image,
        quantity: quantity
      });
    }

    // Save updated cart to localStorage
    localStorage.setItem('cart', JSON.stringify(existingCart));

    // Navigate to cart page
    navigate('/cart');
  };

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
              <span className="price">R{product.price}</span>
              <span className="stock">Stock: {product.stock}</span>
            </section>
            <div className="quantity-selector">
              <label htmlFor="quantity">Quantity:</label>
              <input
                type="number"
                id="quantity"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
              />
            </div>
            <button
              className="add-to-cart-btn"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
          </section>
        </article>
      </section>
    </main>
  );
}

export default ProductDetailsPage; 