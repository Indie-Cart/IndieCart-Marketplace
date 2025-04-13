import React from "react";
import LoginButton from "./LoginButton";
import { useAuth0 } from "@auth0/auth0-react";
import HomePage from "./HomePage";

function App() {
  const { isAuthenticated, user, logout } = useAuth0();

  return (
    <>
      <HomePage />
    </>
  );
}

export default App;