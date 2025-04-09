import React from "react";
import LoginButton from "./LoginButton";
import { useAuth0 } from "@auth0/auth0-react";

function App() {
  const { isAuthenticated, logout, user, loginWithRedirect } = useAuth0();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <h2>Welcome, {user.name}</h2>
          <button onClick={() => logout({ returnTo: window.location.origin })}>
            Log Out
          </button>
        </>
      ) : (
        <LoginButton />
      )}
    </div>
  );
}

export default App;
