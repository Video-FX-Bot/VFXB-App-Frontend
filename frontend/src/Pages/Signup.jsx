import React, { useState } from "react";
import { useAuth } from "../useAuth";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useUI } from "../hooks/useUI";

export default function Signup() {
  const { signup } = useAuth();
  const { theme } = useUI();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [name, setName] = useState(""); // optional display name
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const eTrim = email.trim();
    const uTrim = username.trim();
    if (!uTrim) return setError("Username is required");
    if (!eTrim) return setError("Email is required");
    if (!password) return setError("Password is required");
    if (password !== confirmPassword) return setError("Passwords do not match");

    try {
      setLoading(true);
      // IMPORTANT: pass an object with the fields your backend needs
      await signup({
        username: uTrim,
        email: eTrim,
        password,
        name: name || uTrim,
      });
      navigate("/"); // success
    } catch (err) {
      // surface backend messages like "Email already registered" or validation errors
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
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
          transition={{ duration: 0.5 }}
          className="mb-6 text-center font-bold text-2xl tracking-wide bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-500 bg-clip-text text-transparent"
        >
          Sign Up
        </motion.h2>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Username (required by backend) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <label className="block mb-2 font-medium text-sm">Username</label>
            <motion.input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-base outline-none transition-all duration-300 focus:border-primary focus:shadow-lg focus:shadow-primary/25"
              whileFocus={{ scale: 1.02 }}
              autoFocus
              disabled={loading}
            />
          </motion.div>

          {/* Name (optional) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <label className="block mb-2 font-medium text-sm">
              Name (optional)
            </label>
            <motion.input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-base outline-none transition-all duration-300 focus:border-primary focus:shadow-lg focus:shadow-primary/25"
              whileFocus={{ scale: 1.02 }}
              disabled={loading}
            />
          </motion.div>

          {/* Email */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <label className="block mb-2 font-medium text-sm">Email</label>
            <motion.input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-base outline-none transition-all duration-300 focus:border-primary focus:shadow-lg focus:shadow-primary/25"
              whileFocus={{ scale: 1.02 }}
              disabled={loading}
            />
          </motion.div>

          {/* Password */}
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
              disabled={loading}
            />
          </motion.div>

          {/* Confirm Password */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <label className="block mb-2 font-medium text-sm">
              Confirm Password
            </label>
            <motion.input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-base outline-none transition-all duration-300 focus:border-primary focus:shadow-lg focus:shadow-primary/25"
              whileFocus={{ scale: 1.02 }}
              disabled={loading}
            />
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-destructive mb-2 text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-60 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 text-white border-none rounded-lg font-bold text-base mt-2 shadow-elevation-2 cursor-pointer tracking-wide transition-all duration-300 hover:shadow-elevation-3 hover:shadow-purple-500/25"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-5 text-center text-sm text-muted-foreground"
        >
          Already have an account?{" "}
          <motion.div className="inline-block">
            <Link
              to="/login"
              className="text-purple-400 font-semibold hover:text-purple-300 transition-all duration-200 hover:scale-105 hover:drop-shadow-lg"
              whileHover={{ scale: 1.05 }}
            >
              Login
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
