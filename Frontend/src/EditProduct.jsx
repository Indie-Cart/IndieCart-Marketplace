import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import './EditProduct.css';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecart-dwgnhtdnh9fvashy.eastus-01.azurewebsites.net';

function EditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth0();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [product, setProduct] = useState({
    title: '',
    description: '',
    price: '',
    stock: ''
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!isAuthenticated || !user) {
        setError('Please log in to edit products');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/products/${productId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch product');
        }

        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, isAuthenticated, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const productData = {
        ...product,
        price: parseFloat(product.price),
        stock: parseInt(product.stock, 10)
      };

      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      setSuccess('Product updated successfully!');
      setTimeout(() => {
        navigate('/seller-dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error updating product:', error);
      setError(error.message || 'Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      setSuccess('Product deleted successfully!');
      setTimeout(() => {
        navigate('/seller-dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error deleting product:', error);
      setError(error.message || 'Failed to delete product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="edit-product loading">Loading...</div>;
  }

  if (error) {
    return <div className="edit-product error">{error}</div>;
  }

  return (
    <main className="edit-product">
      <div className="container">
        <h1>Edit Product</h1>
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit} className="edit-product-form">
          <div className="form-group">
            <label htmlFor="title">Product Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={product.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={product.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price (R)</label>
            <input
              type="number"
              id="price"
              name="price"
              value={product.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="stock">Stock Count</label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={product.stock}
              onChange={handleChange}
              min="0"
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="save-btn">Save Changes</button>
            <button type="button" className="delete-btn" onClick={handleDelete}>
              Delete Product
            </button>
            <button type="button" className="cancel-btn" onClick={() => navigate('/seller-dashboard')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default EditProduct; 