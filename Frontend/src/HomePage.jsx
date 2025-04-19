import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import { useAuth0 } from "@auth0/auth0-react";

const API_URL = import.meta.env.VITE_API_URL;
function HomePage() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();

  useEffect(() => {
    const registerBuyer = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await fetch(`${API_URL}/api/buyers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ buyer_id: user.sub }),
          });

          if (!response.ok) {
            throw new Error('Failed to register buyer');
          }
        } catch (error) {
          console.error('Error registering buyer:', error);
        }
      }
    };

    registerBuyer();
  }, [isAuthenticated, user]);

  const featuredProducts = [
    {
      id: 1,
      title: "Handmade Ceramic Mugs",
      creator: "ClayCraft Studio",
      price: "$45",
      image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      rating: 4.8
    },
    {
      id: 2,
      title: "Macrame Wall Hanging",
      creator: "Knotty Creations",
      price: "$65",
      image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      rating: 4.9
    },
    {
      id: 3,
      title: "Wooden Jewelry Box",
      creator: "TimberCraft",
      price: "$85",
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      rating: 4.7
    },
    {
      id: 4,
      title: "Hand-painted Canvas",
      creator: "Artistic Expressions",
      price: "$120",
      image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      rating: 5.0
    }
  ];

  return (
    <main className="home-page">
      <header className="header">
        <section className="container">
          <h1 className="shop-name">IndieCart</h1>
          <nav>
            <ul>
              <li><Link to="/" className="active">Home</Link></li>
              <li><Link to="#">Browse Projects</Link></li>
              {isAuthenticated ? (
                <>
                  <li><span className="user-greeting">Welcome, {user.name}</span></li>
                  <li><button onClick={() => logout({ returnTo: window.location.origin })} className="logout-btn">Log Out</button></li>
                </>
              ) : (
                <li><button onClick={() => loginWithRedirect()} className="login-btn">Log In</button></li>
              )}
              <li><Link to="/about">About</Link></li>
            </ul>
          </nav>
        </section>
      </header>

      <section className="hero">
        <section className="container">
          <article className="hero-content">
            <h1>Discover Unique DIY Projects</h1>
            <p>Join our community of creative makers and find inspiration for your next project</p>
            <section className="cta-buttons">
              <button className="primary-btn">Browse Projects</button>
              <button className="secondary-btn">Start Selling</button>
            </section>
          </article>
        </section>
      </section>

      <section className="products">
        <section className="container">
          <h2>Featured DIY Projects</h2>
          <section className="product-grid">
            {featuredProducts.map(product => (
              <article key={product.id} className="product-card">
                <figure className="product-image">
                  <img src={product.image} alt={product.title} />
                  <figcaption className="product-overlay">
                    <button className="view-details-btn">View Details</button>
                  </figcaption>
                </figure>
                <section className="product-info">
                  <h3>{product.title}</h3>
                  <p className="creator">by {product.creator}</p>
                  <section className="product-meta">
                    <span className="price">{product.price}</span>
                    <span className="rating">⭐ {product.rating}</span>
                  </section>
                </section>
              </article>
            ))}
          </section>
          <section className="view-all-container">
            <button className="view-all-btn">View All Projects</button>
          </section>
        </section>
      </section>

      <section className="features">
        <section className="container">
          <h2>Why Choose IndieCart?</h2>
          <section className="feature-grid">
            <article className="feature-card">
              <span className="feature-icon">🎨</span>
              <h3>Unique Creations</h3>
              <p>Discover one-of-a-kind DIY projects from talented artists worldwide</p>
            </article>
            <article className="feature-card">
              <span className="feature-icon">💡</span>
              <h3>Learn & Create</h3>
              <p>Follow detailed tutorials and create your own masterpieces</p>
            </article>
            <article className="feature-card">
              <span className="feature-icon">🤝</span>
              <h3>Support Artists</h3>
              <p>Directly support independent creators and their craft</p>
            </article>
          </section>
        </section>
      </section>

      <section className="cta-section">
        <section className="container">
          <h2>Ready to Start Your Creative Journey?</h2>
          <p>Join our community of makers and share your unique creations with the world</p>
          <button className="primary-btn">Get Started</button>
        </section>
      </section>

      <footer className="footer">
        <section className="container">
          <p>&copy; 2025 IndieCart. All rights reserved.</p>
        </section>
      </footer>

      
    </main>
  );
}

export default HomePage;
