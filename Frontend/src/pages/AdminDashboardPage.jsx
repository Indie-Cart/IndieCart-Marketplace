import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboardPage.css';

const AdminDashboardPage = () => {
    const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedSellerProducts, setSelectedSellerProducts] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [loadingButtons, setLoadingButtons] = useState({});
    const [viewingProducts, setViewingProducts] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAdminStatusAndFetchSellers = async () => {
            if (isLoading || !isAuthenticated) {
                setLoading(false);
                return;
            }

            try {
                const token = await getAccessTokenSilently();

                // Check admin status
                const adminCheckResponse = await fetch('/api/admin/check', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-user-id': user.sub
                    }
                });

                if (adminCheckResponse.status === 403) {
                    setIsAdmin(false);
                    setLoading(false);
                    // Redirect to home or unauthorized page
                    navigate('/', { replace: true }); // Or a dedicated unauthorized page
                    return;
                }

                if (!adminCheckResponse.ok) {
                    throw new Error('Failed to check admin status');
                }

                setIsAdmin(true);

                // Fetch sellers if admin
                const sellersResponse = await fetch('/api/admin/sellers', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-user-id': user.sub
                    }
                });

                if (!sellersResponse.ok) {
                    throw new Error('Failed to fetch sellers');
                }

                const sellersData = await sellersResponse.json();
                setSellers(sellersData);
                setLoading(false);

            } catch (err) {
                console.error('Error fetching admin data:', err);
                setError(err.message);
                setLoading(false);
                setIsAdmin(false);
                navigate('/', { replace: true }); // Redirect on error as well
            }
        };

        checkAdminStatusAndFetchSellers();
    }, [user, isAuthenticated, isLoading, getAccessTokenSilently, navigate]);

    const handleViewProducts = async (sellerId) => {
        setViewingProducts(true);
        setError(null);
        setSelectedSeller(sellers.find(seller => seller.seller_id === sellerId));
        try {
            const token = await getAccessTokenSilently();
            const productsResponse = await fetch(`/api/admin/sellers/${sellerId}/products`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-user-id': user.sub
                }
            });

            if (!productsResponse.ok) {
                throw new Error('Failed to fetch seller products');
            }

            const productsData = await productsResponse.json();
            setSelectedSellerProducts(productsData);
        } catch (err) {
            console.error('Error fetching seller products:', err);
            setError(err.message);
            setSelectedSellerProducts([]);
        } finally {
            setViewingProducts(false);
        }
    };

    const handleDeleteSeller = async (sellerId) => {
        if (window.confirm(`Are you sure you want to delete seller ${sellerId} and all their products?`)) {
            setLoadingButtons(prev => ({ ...prev, [sellerId]: true }));
            setError(null);
            try {
                const token = await getAccessTokenSilently();
                const response = await fetch(`/api/admin/sellers/${sellerId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-user-id': user.sub
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to delete seller');
                }

                // Remove seller from list
                setSellers(sellers.filter(seller => seller.seller_id !== sellerId));
                setSelectedSellerProducts([]); // Clear products if the deleted seller's products were shown
                setSelectedSeller(null);

            } catch (err) {
                console.error('Error deleting seller:', err);
                setError(err.message);
            } finally {
                setLoadingButtons(prev => ({ ...prev, [sellerId]: false }));
            }
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (window.confirm(`Are you sure you want to delete product ${productId}?`)) {
            setLoadingButtons(prev => ({ ...prev, [productId]: true }));
            setError(null);
            try {
                const token = await getAccessTokenSilently();
                const response = await fetch(`/api/admin/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-user-id': user.sub
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to delete product');
                }

                // Remove product from selected seller's product list
                setSelectedSellerProducts(selectedSellerProducts.filter(product => product.product_id !== productId));

            } catch (err) {
                console.error('Error deleting product:', err);
                setError(err.message);
            } finally {
                setLoadingButtons(prev => ({ ...prev, [productId]: false }));
            }
        }
    };

    if (loading) {
        return <div className="loading-container">Loading...</div>;
    }

    return (
        <div className="admin-dashboard-container">
            <h1>Admin Dashboard</h1>
            {error && <div className="error-message">Error: {error}</div>}
            <h2>All Sellers</h2>
            <ul className="seller-list">
                {sellers.map(seller => (
                    <li key={seller.seller_id} className="seller-item">
                        <span>{seller.shop_name} ({seller.seller_id})</span>
                        <div className="seller-actions">
                            <button
                                className="view-button"
                                onClick={() => handleViewProducts(seller.seller_id)}
                                disabled={viewingProducts}
                            >
                                {viewingProducts && selectedSeller?.seller_id === seller.seller_id ? 'Loading...' : 'View Products'}
                            </button>
                            <button
                                className="delete-button"
                                onClick={() => handleDeleteSeller(seller.seller_id)}
                                disabled={loadingButtons[seller.seller_id]}
                            >
                                {loadingButtons[seller.seller_id] ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {selectedSeller && (
                <div className="seller-products-section">
                    <h2>Products for {selectedSeller.shop_name}</h2>
                    {viewingProducts ? (
                        <div className="loading-container">Loading products...</div>
                    ) : (
                        <ul className="product-list">
                            {selectedSellerProducts.length > 0 ? (
                                selectedSellerProducts.map(product => (
                                    <li key={product.product_id} className="product-item">
                                        <img src={product.image_url} alt={product.title} />
                                        <div className="product-details">
                                            <span>{product.title}</span>
                                            <span>ID: {product.product_id}</span>
                                            <span>Stock: {product.stock}</span>
                                        </div>
                                        <div className="product-actions">
                                            <button
                                                className="delete-button"
                                                onClick={() => handleDeleteProduct(product.product_id)}
                                                disabled={loadingButtons[product.product_id]}
                                            >
                                                {loadingButtons[product.product_id] ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li>No products found for this seller.</li>
                            )}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage; 