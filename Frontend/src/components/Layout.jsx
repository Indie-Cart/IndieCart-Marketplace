import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './Layout.css';

function Layout({ children }) {
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="layout">
      <header className="header">
        <section className="container">
          <h1 className="shop-name">IndieCart</h1>
          <nav>
            <ul>
              <li><Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link></li>
              <li><Link to="/products" className={isActive('/products') ? 'active' : ''}>Browse Products</Link></li>
              {isAuthenticated ? (
                <>
                  <li><Link to="/seller-dashboard" className={isActive('/seller-dashboard') ? 'active' : ''}>Seller Dashboard</Link></li>
                  <li><span className="user-greeting">Welcome, {user.email.split('@')[0]}</span></li>
                  <li><button onClick={() => logout({ returnTo: window.location.origin })} className="logout-btn">Log Out</button></li>
                </>
              ) : (
                <li><button onClick={() => loginWithRedirect()} className="login-btn">Log In</button></li>
              )}
              <li><Link to="/about" className={isActive('/about') ? 'active' : ''}>About</Link></li>
              {isAuthenticated && (
                <li className="cart-icon-container">
                  <Link to="/cart" className={`cart-icon ${isActive('/cart') ? 'active' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </section>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <section className="container">
          <p>&copy; 2025 IndieCart. All rights reserved.</p>
        </section>
      </footer>
    </div>
  );
}

export default Layout; 