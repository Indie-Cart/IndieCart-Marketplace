import React, { useState } from 'react';
import './AddProduct.css';

const AddProduct = () => {
    const [formData, setFormData] = useState({
        seller_id: '',
        title: '',
        description: '',
        price: '',
        stock: '',
        image: null
    });

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
        
        const formDataToSend = new FormData();
        formDataToSend.append('seller_id', formData.seller_id);
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('price', formData.price);
        formDataToSend.append('stock', formData.stock);
        
        if (formData.image) {
            formDataToSend.append('image', formData.image);
        }

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                body: formDataToSend
            });

            const data = await response.json();

            if (response.ok) {
                alert('Product added successfully!');
                setFormData({
                    seller_id: '',
                    title: '',
                    description: '',
                    price: '',
                    stock: '',
                    image: null
                });
            } else {
                throw new Error(data.message || data.error || 'Failed to add product');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    return (
        <div className="add-product-container">
            <h2>Add New Product</h2>
            <form onSubmit={handleSubmit} className="add-product-form">
                <div className="form-group">
                    <label htmlFor="seller_id">Seller ID:</label>
                    <input
                        type="text"
                        id="seller_id"
                        name="seller_id"
                        value={formData.seller_id}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="title">Product Title:</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
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
                    />
                </div>

                <button type="submit" className="submit-btn">Add Product</button>
            </form>
        </div>
    );
};

export default AddProduct; 