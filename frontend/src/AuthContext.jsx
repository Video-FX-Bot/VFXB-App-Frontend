import React, { useState, useEffect } from "react";
import { AuthContext } from "./AuthContextInstance";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
    }
  }, []);

  // Save to localStorage when user changes
  useEffect(() => {
    if (isLoggedIn && user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [isLoggedIn, user]);

  // Mock login
  const login = (email, password) => {
    setUser({ email });
    setIsLoggedIn(true);
  };

  // Mock signup
  const signup = (email, password) => {
    setUser({ email });
    setIsLoggedIn(true);
  };

  // Logout
  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
} 