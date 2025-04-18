import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Auth0Provider } from '@auth0/auth0-react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Auth0Provider
    domain="dev-2ino8rpuh481p7q0.us.auth0.com"
    clientId="FCOgq96heSlPlwhAf5yNYC8nfAp4TptY"
    authorizationParams={{
      redirect_uri: window.location.origin
    }}
    cacheLocation="localstorage"
    useRefreshTokens={true}
  >
    <App />
  </Auth0Provider>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
