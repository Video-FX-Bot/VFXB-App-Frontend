// src/AuthProvider.jsx  (or wherever this file lives)
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AuthContext } from "./AuthContextInstance";
import authService from "./services/authService";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [isLoggedIn, setIsLoggedIn] = useState(!!authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  // Optional: hydrate on mount from authService (already done via getCurrentUser)
  useEffect(() => {
    const u = authService.getCurrentUser();
    setUser(u);
    setIsLoggedIn(!!u);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      const { user } = await authService.login({ email, password }); // throws on 401
      setUser(user);
      setIsLoggedIn(true);
      return { success: true, user };
    } catch (err) {
      // ensure UI shows backend errors like "Invalid email or password"
      setUser(null);
      setIsLoggedIn(false);
      throw err; // let Login.jsx catch and display
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async ({ username, email, password, name }) => {
    setLoading(true);
    try {
      const { user } = await authService.signup({
        username,
        email,
        password,
        name,
      });
      setUser(user);
      setIsLoggedIn(true);
      return { success: true, user };
    } catch (err) {
      setUser(null);
      setIsLoggedIn(false);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  const value = useMemo(
    () => ({ user, isLoggedIn, loading, login, signup, logout }),
    [user, isLoggedIn, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
