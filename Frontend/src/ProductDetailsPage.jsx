import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './ProductDetailsPage.css';

// Determine API URL based on environment
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth0();

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

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  const addToCart = async () => {
    if (!product || !isAuthenticated) return;
    
    setAddingToCart(true);
    try {
      const response = await fetch(`${API_URL}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.sub // Add user ID from Auth0
        },
        credentials: 'include',
        body: JSON.stringify({
          productId: product.product_id,
          quantity: quantity
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item to cart');
      }

      // Show success message and redirect to cart
      alert('Item added to cart successfully!');
      navigate('/cart');
    } catch (err) {
      setError(err.message);
      alert('Failed to add item to cart: ' + err.message);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) return <div className="loading">Loading product details...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!product) return <div className="error">Product not found</div>;

  return (
    <main className="product-details-page">
      <section className="container">
        <article className="product-details">
          <figure className="product-image">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} />
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
              <button 
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                className="quantity-btn"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="quantity-input"
              />
              <button 
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= product.stock}
                className="quantity-btn"
              >
                +
              </button>
            </div>
            <button 
              className="add-to-cart-btn"
              onClick={addToCart}
              disabled={addingToCart || product.stock === 0 || !isAuthenticated}
            >
              {!isAuthenticated ? 'Login to Add to Cart' : 
               addingToCart ? 'Adding...' : 
               product.stock === 0 ? 'Out of Stock' : 
               'Add to Cart'}
            </button>
          </section>
        </article>
      </section>
    </main>
  );
}

export default ProductDetailsPage; 