import { createContext } from "react";

export const AuthContext = createContext({
  user: null,
  isLoggedIn: false,
  login: () => {},
  signup: () => {},
  logout: () => {}
});