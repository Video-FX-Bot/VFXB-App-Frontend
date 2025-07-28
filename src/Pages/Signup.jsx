import React, { useState } from "react";
import { useAuth } from "../useAuth";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    signup(email, password);
    navigate("/");
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        background: "rgba(30, 41, 59, 0.95)",
        padding: 36,
        borderRadius: 16,
        boxShadow: "0 4px 32px 0 rgba(0,0,0,0.25)",
        minWidth: 340,
        width: "100%",
        maxWidth: 400,
        color: "#fff"
      }}>
        <h2 style={{ marginBottom: 24, textAlign: "center", fontWeight: 700, fontSize: 28, letterSpacing: 1 }}>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #F472B6",
                background: "#fff",
                color: "#222",
                fontSize: 16,
                outline: "none",
                transition: "border 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={e => e.target.style.border = '1.5px solid #8b5cf6'}
              onBlur={e => e.target.style.border = '1px solid #F472B6'}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #F472B6",
                background: "#fff",
                color: "#222",
                fontSize: 16,
                outline: "none",
                transition: "border 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={e => e.target.style.border = '1.5px solid #8b5cf6'}
              onBlur={e => e.target.style.border = '1px solid #F472B6'}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #F472B6",
                background: "#fff",
                color: "#222",
                fontSize: 16,
                outline: "none",
                transition: "border 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={e => e.target.style.border = '1.5px solid #8b5cf6'}
              onBlur={e => e.target.style.border = '1px solid #F472B6'}
            />
          </div>
          {error && <div style={{ color: "#F472B6", marginBottom: 14, textAlign: "center", fontWeight: 500 }}>{error}</div>}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px 0",
              background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              marginTop: 4,
              boxShadow: "0 2px 8px 0 rgba(139, 92, 246, 0.15)",
              cursor: "pointer",
              letterSpacing: 1
            }}
          >
            Sign Up
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 15 }}>
          Already have an account? <Link to="/login" style={{ color: "#8b5cf6", fontWeight: 600 }}>Login</Link>
        </div>
      </div>
    </div>
  );
} 