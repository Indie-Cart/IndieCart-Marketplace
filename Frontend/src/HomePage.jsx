import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HomePage.css';
import { useAuth0 } from "@auth0/auth0-react";

// Determine API URL based on environment./
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://indiecart-dwgnhtdnh9fvashy.eastus-01.azurewebsites.net';

function HomePage() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();

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
      title: "Clay Mug",
      creator: "ClayCraft Studio",
      price: "R45",
      image: "https://i.pinimg.com/736x/88/76/90/88769088ec2cce51220254c412f4b0e2.jpg",
      rating: 4.8
    },
    {
      id: 2,
      title: "Macrame Wall Hanging",
      creator: "Knotty Creations",
      price: "R65",
      image: "https://i.etsystatic.com/12804288/r/il/065b6f/2512936856/il_fullxfull.2512936856_i1a0.jpg",
      rating: 4.9
    },
    {
      id: 3,
      title: "Everyday Water Bottle",
      creator: "TimberCraft",
      price: "R85",
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      rating: 4.7
    },
    {
      id: 4,
      title: "Hand-painted Canvas",
      creator: "Artistic Expressions",
      price: "R120",
      image: "https://th.bing.com/th/id/R.df19ece026dccbb7a2ef484e2a62796c?rik=3dWmAZcWi66mEQ&riu=http%3a%2f%2fwww.book530.com%2fpaintingpic%2f20%2fHand-Painted-Oil-Paintings-Canvas-Wall.jpg&ehk=blzB%2f58q5Eg51qQYCgUdjb2%2bO%2fhxeibthur6Bfqa93M%3d&risl=&pid=ImgRaw&r=0",
      rating: 5.0
    }
  ];

  return (
    <main className="home-page">
      <section className="hero">
        <section className="container">
          <article className="hero-content">
            <h1>Discover Unique DIY Projects</h1>
            <p>Crafted with heart. Curated for you.</p>
            <section className="cta-buttons">
              <button onClick={() => navigate('/products')} className="primary-btn">Browse Products</button>
              <button onClick={() => navigate('/apply-seller')} className="secondary-btn">Start Selling</button>
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
                    <button onClick={() => navigate(`/products/${product.id}`)} className="view-details-btn">View Details</button>
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
            <button onClick={() => navigate('/products')} className="view-all-btn">View All Projects</button>
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
          <button onClick={() => {
            if (isAuthenticated) {
              navigate('/seller-dashboard');
            } else {
              loginWithRedirect();
            }
          }} className="primary-btn">Get Started</button>
        </section>
      </section>
    </main>
  );
}

export default HomePage;
