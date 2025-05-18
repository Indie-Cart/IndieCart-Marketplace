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
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link> / <Link to="/products">Products</Link> / <span>{product.title}</span>
        </div>

        <div className="product-details">
          <div className="product-gallery">
            <div className="main-image">
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={product.title} />
              ) : (
                <div className="no-image">No Image Available</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="thumbnail-gallery">
                {images.map((image, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={image} alt={`${product.title} - view ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <div className="product-header">
              <h1>{product.title}</h1>
              <div className="product-meta">
                <Link
                  to={`/seller/${encodeURIComponent(product.shop_name || 'Unknown Shop')}`}
                  className="seller-link"
                >
                  {product.shop_name || 'Unknown Shop'}
                </Link>
                <span className="stock-status">
                  {product.stock > 0 ? `${product.stock} in Stock` : 'Out of Stock'}
                </span>
              </div>
            </div>

            <div className="price-section">
              <span className="price">R{product.price}</span>
              {product.original_price && (
                <span className="original-price">R{product.original_price}</span>
              )}
            </div>

            <div className="product-description">
              <h2>Description</h2>
              <p>{product.description}</p>
            </div>

            <div className="product-features">
              <h2>Features</h2>
              <ul>
                {product.features?.map((feature, index) => (
                  <li key={index}>{feature}</li>
                )) || (
                    <>
                      <li>High-quality materials</li>
                      <li>Handcrafted with care</li>
                      <li>Unique design</li>
                    </>
                  )}
              </ul>
            </div>

            <div className="purchase-section">
              <div className="quantity-selector">
                <label>Quantity:</label>
                <div className="quantity-controls">
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
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ProductDetailsPage;