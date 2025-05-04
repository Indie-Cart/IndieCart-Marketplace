import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from "@auth0/auth0-react";
import './AboutPage.css';

function AboutPage() {
  const navigate = useNavigate();
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="container">
          <h1>About IndieCart</h1>
          <p className="hero-subtitle">Empowering Creators, Connecting Communities</p>
        </div>
      </section>

      <section className="about-content">
        <div className="container">
          <section className="mission-section">
            <h2>Our Mission</h2>
            <p>
              IndieCart was born from a simple idea: to create a platform where independent creators
              can showcase their unique DIY projects and connect with people who appreciate handmade,
              one-of-a-kind items. We believe in supporting local artisans and fostering a community
              of creativity and innovation.
            </p>
          </section>

          <section className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3>For Creators</h3>
              <p>
                A platform to showcase your unique creations, reach a wider audience,
                and turn your passion into a sustainable business.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛍️</div>
              <h3>For Buyers</h3>
              <p>
                Discover unique, handmade items that tell a story. Support independent
                creators and find one-of-a-kind pieces for your home or as gifts.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>For Community</h3>
              <p>
                Join a vibrant community of makers and enthusiasts. Share ideas,
                learn new skills, and be part of a movement that values creativity
                and craftsmanship.
              </p>
            </div>
          </section>

          <section className="values-section">
            <h2>Our Values</h2>
            <div className="values-grid">
              <div className="value-card">
                <h3>Creativity</h3>
                <p>We celebrate unique ideas and original creations.</p>
              </div>
              <div className="value-card">
                <h3>Community</h3>
                <p>Building connections between creators and appreciators.</p>
              </div>
              <div className="value-card">
                <h3>Sustainability</h3>
                <p>Supporting local makers and eco-friendly practices.</p>
              </div>
              <div className="value-card">
                <h3>Quality</h3>
                <p>Promoting high-quality, handmade craftsmanship.</p>
              </div>
            </div>
          </section>

          <section className="cta-section">
            <h2>Join Our Community</h2>
            <p>
              Whether you're a creator looking to showcase your work or someone who
              appreciates unique, handmade items, IndieCart is the place for you.
            </p>
            <div className="cta-buttons">
              <button
                className="get-started-btn"
                onClick={() => navigate('/products')}
              >
                Browse Projects
              </button>
              <button
                className="selling-btn"
                onClick={() => {
                  if (isAuthenticated) {
                    navigate('/seller-dashboard');
                  } else {
                    loginWithRedirect();
                  }
                }}
              >
                Start Selling
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default AboutPage; 