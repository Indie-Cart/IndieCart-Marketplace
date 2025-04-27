import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './Layout.css';

function Layout({ children }) {
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
  const navigate = useNavigate();

  return (
    <div className="layout">
      <header className="header">
        <section className="container">
          <h1 className="shop-name">IndieCart</h1>
          <nav>
            <ul>
              <li><Link to="/" className="active">Home</Link></li>
              <li><Link to="/products">Browse Products</Link></li>
              {isAuthenticated ? (
                <>
                  <li><Link to="/add-product">Add Product</Link></li>
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