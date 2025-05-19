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
  const [selectedImage, setSelectedImage] = useState(0);
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
          'x-user-id': user.sub
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

      alert('Item added to cart successfully!');
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

  // Create an array of images (main image + additional images if available)
  const images = [product.image_url, ...(product.additional_images || [])].filter(Boolean);

  return (
    <main className="product-details-page">
      <div className="breadcrumb">
        <Link to="/">Home</Link> / <Link to="/products">Products</Link> / <span>{product.title}</span>
      </div>
      <div className="product-details-container">
        <section className="product-image-section">
          <div className="product-main-image">
            {images[selectedImage] ? (
              <img src={images[selectedImage]} alt={product.title} />
            ) : (
              <div className="no-image">No Image Available</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="product-thumbnails">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`product-thumbnail${selectedImage === idx ? ' active' : ''}`}
                  onClick={() => setSelectedImage(idx)}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="product-info-section">
          <div className="product-title-row">
            <h1 className="product-title">{product.title}</h1>
            <span className="product-stock">{product.stock > 0 ? `${product.stock} in Stock` : 'Out of Stock'}</span>
          </div>
          <div className="product-meta-row">
            <Link
              to={`/seller/${encodeURIComponent(product.shop_name || 'Unknown Shop')}`}
              className="seller-link"
            >
              {product.shop_name || 'Unknown Shop'}
            </Link>
          </div>
          <div className="product-price-row">
            <span className="product-price">R{product.price}</span>
            {product.original_price && (
              <span className="product-original-price">R{product.original_price}</span>
            )}
          </div>
          <div className="product-section-card">
            <h2>Description</h2>
            <p>{product.description}</p>
          </div>
          <div className="product-section-card">
            <h2>Features</h2>
            <ul>
              {(product.features || []).length > 0 ? (
                product.features.map((feature, i) => <li key={i}>{feature}</li>)
              ) : (
                <>
                  <li>High-quality materials</li>
                  <li>Handcrafted with care</li>
                  <li>Unique design</li>
                </>
              )}
            </ul>
          </div>
          <div className="product-purchase-row">
            <div className="quantity-selector">
              <button className="quantity-btn" onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= 1}>-</button>
              <input
                className="quantity-input"
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={e => handleQuantityChange(Number(e.target.value) || 1)}
              />
              <button className="quantity-btn" onClick={() => handleQuantityChange(quantity + 1)} disabled={quantity >= product.stock}>+</button>
            </div>
            <button
              className="add-to-cart-btn"
              onClick={addToCart}
              disabled={addingToCart || product.stock === 0 || !isAuthenticated}
            >
              {!isAuthenticated ? 'Login to Add to Cart' : addingToCart ? 'Adding...' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ProductDetailsPage;