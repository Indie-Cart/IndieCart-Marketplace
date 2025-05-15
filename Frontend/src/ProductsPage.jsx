import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ProductsPage.css';

// Determine API URL based on environment
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecartmarket-byhqamdkhngqhpbd.southafricanorth-01.azurewebsites.net';

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 2000,
    sortBy: 'newest'
  });
  const [priceRange, setPriceRange] = useState({
    min: 0,
    max: 2000
  });
  const sliderTrackRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data);
        setFilteredProducts(data);
        // Set max price based on highest product price
        const maxProductPrice = Math.max(...data.map(p => p.price));
        const roundedMaxPrice = Math.ceil(maxProductPrice / 100) * 100; // Round up to nearest 100
        setPriceRange({
          min: 0,
          max: roundedMaxPrice
        });
        setFilters(prev => ({
          ...prev,
          maxPrice: roundedMaxPrice
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (sliderTrackRef.current) {
      const minPercent = ((filters.minPrice - priceRange.min) / (priceRange.max - priceRange.min)) * 100;
      const maxPercent = ((filters.maxPrice - priceRange.min) / (priceRange.max - priceRange.min)) * 100;
      sliderTrackRef.current.style.setProperty('--min-percent', `${minPercent}%`);
      sliderTrackRef.current.style.setProperty('--max-percent', `${maxPercent}%`);
    }
  }, [filters.minPrice, filters.maxPrice, priceRange]);

  useEffect(() => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply price range filter
    filtered = filtered.filter(product =>
      product.price >= filters.minPrice && product.price <= filters.maxPrice
    );

    // Apply sorting
    switch (filters.sortBy) {
      case 'price-low-high':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => b.product_id - a.product_id);
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [searchQuery, products, filters]);

  const handleMinPriceChange = (e) => {
    const value = Number(e.target.value);
    if (value <= filters.maxPrice) {
      setFilters(prev => ({
        ...prev,
        minPrice: value
      }));
    }
  };

  const handleMaxPriceChange = (e) => {
    const value = Number(e.target.value);
    if (value >= filters.minPrice) {
      setFilters(prev => ({
        ...prev,
        maxPrice: value
      }));
    }
  };

  const handleSortChange = (e) => {
    setFilters(prev => ({
      ...prev,
      sortBy: e.target.value
    }));
  };

  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <main className="products-page">
      <section className="hero-section">
        <section className="container">
          <article className="hero-content">
            <h1>All Products</h1>
            <p>Crafted with heart. Curated for you.</p>
          </article>
        </section>
      </section>
      <section className="container">
        <div className="filters-container">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>
          <div className="filter-controls">
            <div className="price-slider-container">
              <label>Price Range: R{filters.minPrice} - R{filters.maxPrice}</label>
              <div className="price-slider">
                <div className="slider-track" ref={sliderTrackRef}></div>
                <input
                  type="range"
                  min={priceRange.min}
                  max={priceRange.max}
                  value={filters.minPrice}
                  onChange={handleMinPriceChange}
                  className="range-slider min-slider"
                />
                <input
                  type="range"
                  min={priceRange.min}
                  max={priceRange.max}
                  value={filters.maxPrice}
                  onChange={handleMaxPriceChange}
                  className="range-slider max-slider"
                />
              </div>
            </div>
            <div className="sort-container">
              <select
                name="sortBy"
                value={filters.sortBy}
                onChange={handleSortChange}
                className="sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="price-low-high">Price: Low to High</option>
                <option value="price-high-low">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
        <section className="product-grid">
          {filteredProducts.map(product => (
            <article key={product.product_id} className="product-card">
              <figure className="product-image">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.title} />
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
                <p className="creator">
                  by{' '}
                  <Link
                    to={`/seller/${encodeURIComponent(product.shop_name || 'Unknown Shop')}`}
                    className="seller-link"
                  >
                    {product.shop_name || 'Unknown Shop'}
                  </Link>
                </p>
                <section className="product-meta">
                  <span className="price">R{product.price}</span>
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

export default ProductsPage; 