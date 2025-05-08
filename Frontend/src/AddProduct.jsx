import React, { useState, useEffect } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from 'react-router-dom';
import { supabaseStorage } from './utils/supabaseClient';
import './AddProduct.css';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

const AddProduct = () => {
    const { isAuthenticated, user } = useAuth0();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        stock: '',
        image: null
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        setFormData(prev => ({
            ...prev,
            image: e.target.files[0]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        if (!isAuthenticated || !user) {
            setError('Please log in to add products');
            setIsLoading(false);
            return;
        }

        try {
            let imageUrl = null;
            
            // Upload image to Supabase Storage if an image was selected
            if (formData.image) {
                const fileExt = formData.image.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                // Replace special characters in user ID with underscores
                const safeUserId = user.sub.replace(/[^a-zA-Z0-9]/g, '_');
                const filePath = `${safeUserId}/${fileName}`;

                console.log('Attempting to upload image:', {
                    filePath,
                    fileType: formData.image.type,
                    fileSize: formData.image.size
                });

                const { data: uploadData, error: uploadError } = await supabaseStorage.storage
                    .from('product-images')
                    .upload(filePath, formData.image, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Upload error details:', {
                        error: uploadError,
                        message: uploadError.message,
                        statusCode: uploadError.statusCode,
                        name: uploadError.name
                    });
                    throw new Error(`Failed to upload image: ${uploadError.message}`);
                }

                console.log('Upload successful:', uploadData);

                // Get the public URL for the uploaded image
                const { data: { publicUrl } } = supabaseStorage.storage
                    .from('product-images')
                    .getPublicUrl(filePath);

                console.log('Generated public URL:', publicUrl);
                imageUrl = publicUrl;
            }

            // Send product data to your backend
            const response = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    seller_id: user.sub,
                    title: formData.title,
                    description: formData.description,
                    price: formData.price,
                    stock: formData.stock,
                    image_url: imageUrl
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Product added successfully!');
                setFormData({
                    title: '',
                    description: '',
                    price: '',
                    stock: '',
                    image: null
                });
                navigate('/seller-dashboard');
            } else {
                throw new Error(data.error || 'Failed to add product');
            }
        } catch (error) {
            console.error('Error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) {
        return <div className="add-product-container">Please log in to add products</div>;
    }

    return (
        <div className="add-product-container">
            <h2>Add New Product</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="add-product-form">
                <div className="form-group">
                    <label htmlFor="title">Product Title:</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description:</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="price">Price:</label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        step="0.01"
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="stock">Stock:</label>
                    <input
                        type="number"
                        id="stock"
                        name="stock"
                        value={formData.stock}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="image">Product Image:</label>
                    <input
                        type="file"
                        id="image"
                        name="image"
                        onChange={handleImageChange}
                        accept="image/*"
                        required
                        disabled={isLoading}
                    />
                </div>

                <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <span>Adding Product...</span>
                        </div>
                    ) : (
                        'Add Product'
                    )}
                </button>
            </form>
        </div>
    );
};

export default AddProduct; 