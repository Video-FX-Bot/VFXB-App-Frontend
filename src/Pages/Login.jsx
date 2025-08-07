import React, { useState } from "react";
import { useAuth } from "../useAuth";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useUI } from "../hooks/useUI";

export default function Login() {
  const { login } = useAuth();
  const { theme } = useUI();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    login(email, password);
    navigate("/");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card border border-border p-9 rounded-2xl shadow-elevation-3 min-w-[340px] w-full max-w-md text-foreground"
      >
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6 text-center font-bold text-2xl tracking-wide bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-500 bg-clip-text text-transparent"
        >
          Login
        </motion.h2>
        <motion.form 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <label className="block mb-2 font-medium text-sm">Email</label>
            <motion.input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-base outline-none transition-all duration-300 focus:border-primary focus:shadow-lg focus:shadow-primary/25"
              whileFocus={{ scale: 1.02 }}
              autoFocus
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <label className="block mb-2 font-medium text-sm">Password</label>
            <motion.input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-base outline-none transition-all duration-300 focus:border-primary focus:shadow-lg focus:shadow-primary/25"
              whileFocus={{ scale: 1.02 }}
            />
          </motion.div>
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-destructive mb-4 text-center font-medium"
            >
              {error}
            </motion.div>
          )}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none rounded-lg font-bold text-base mt-2 shadow-elevation-2 cursor-pointer tracking-wide transition-all duration-300 hover:shadow-elevation-3 hover:shadow-purple-500/25"
          >
            Login
          </motion.button>
        </motion.form>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-5 text-center text-sm text-muted-foreground"
        >
          Don't have an account? <motion.div className="inline-block"><Link to="/signup" className="text-purple-400 font-semibold hover:text-purple-300 transition-all duration-200 hover:scale-105 hover:drop-shadow-lg" whileHover={{ scale: 1.05 }}>Sign up</Link></motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
} 