import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './Layout.css';

function Layout({ children }) {
  const { isAuthenticated, user, isLoading, getAccessTokenSilently, loginWithRedirect, logout } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status when authentication status changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated || isLoading) {
        setIsAdmin(false);
        return;
      }
      try {
        const token = await getAccessTokenSilently();
        const adminCheckResponse = await fetch('/api/admin/check', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-user-id': user.sub
          }
        });

        if (adminCheckResponse.ok) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status in layout:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, isLoading, user, getAccessTokenSilently]);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getUserDisplayName = () => {
    if (!user?.email) return '';
    return user.email.split('@')[0];
  };

  return (
    <div className="layout">
      <header className="header">
        <section className="container header-flex">
          <h1 className="shop-name">IndieCart</h1>
          <nav>
            <ul>
              <li><Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link></li>
              <li><Link to="/products" className={isActive('/products') ? 'active' : ''}>Browse Products</Link></li>
              {isAuthenticated ? (
                <>
                  {/* Admin Dashboard link - visible only if isAdmin is true */}
                  {isAdmin && (
                    <li><Link to="/admin-dashboard" className={isActive('/admin-dashboard') ? 'active' : ''}>Admin Dashboard</Link></li>
                  )}
                  <li><Link to="/seller-dashboard" className={isActive('/seller-dashboard') ? 'active' : ''}>Seller Dashboard</Link></li>
                  <li><Link to="/about" className={isActive('/about') ? 'active' : ''}>About</Link></li>
                  <li><button onClick={() => logout({ returnTo: window.location.origin })} className="logout-btn">Log Out</button></li>
                  <li><span className="user-greeting">Welcome, {getUserDisplayName()}</span></li>
                  <li><Link to="/cart" className={`cart-icon ${isActive('/cart') ? 'active' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                  </Link></li>
                  <li><Link to="/my-account" className={`profile-icon ${isActive('/my-account') ? 'active' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/about" className={isActive('/about') ? 'active' : ''}>About</Link></li>
                  <li><button onClick={() => loginWithRedirect()} className="login-btn">Log In</button></li>
                </>
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