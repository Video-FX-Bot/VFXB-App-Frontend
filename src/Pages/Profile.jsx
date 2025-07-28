import React, { useState } from "react";
import { useAuth } from "../useAuth";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || "",
    displayName: "Anjay",
    bio: "Video editor and content creator",
    timezone: "UTC-5",
    notifications: true
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSave = () => {
    // In a real app, this would save to backend
    setIsEditing(false);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h2>Please log in to view your profile</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Profile</h1>
        <p style={{ color: "#9CA3AF" }}>Manage your account settings and preferences</p>
      </div>

      <div style={{ display: "grid", gap: 24 }}>
        {/* Personal Information */}
        <div style={{
          background: "rgba(30, 41, 59, 0.95)",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #374151"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>Personal Information</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                padding: "8px 16px",
                background: isEditing ? "#EF4444" : "#8B5CF6",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={!isEditing}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: isEditing ? "#1F2937" : "#111827",
                  color: "white",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                disabled={!isEditing}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: isEditing ? "#1F2937" : "#111827",
                  color: "white",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                disabled={!isEditing}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: isEditing ? "#1F2937" : "#111827",
                  color: "white",
                  outline: "none",
                  resize: "vertical"
                }}
              />
            </div>

            {isEditing && (
              <button
                onClick={handleSave}
                style={{
                  padding: "10px 20px",
                  background: "#10B981",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 500,
                  alignSelf: "flex-start"
                }}
              >
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Account Settings */}
        <div style={{
          background: "rgba(30, 41, 59, 0.95)",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #374151"
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Account Settings</h2>
          
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
              <div>
                <h3 style={{ fontWeight: 500, marginBottom: 4 }}>Email Notifications</h3>
                <p style={{ color: "#9CA3AF", fontSize: 14 }}>Receive updates about your projects</p>
              </div>
              <label style={{ position: "relative", display: "inline-block", width: 50, height: 24 }}>
                <input
                  type="checkbox"
                  checked={formData.notifications}
                  onChange={(e) => setFormData({...formData, notifications: e.target.checked})}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: formData.notifications ? "#8B5CF6" : "#374151",
                  borderRadius: 12,
                  transition: "0.3s"
                }}>
                  <span style={{
                    position: "absolute",
                    content: "",
                    height: 18,
                    width: 18,
                    left: 3,
                    bottom: 3,
                  background: "white",
                  borderRadius: "50%",
                  transition: "0.3s",
                  transform: formData.notifications ? "translateX(26px)" : "translateX(0)"
                }} />
                </span>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
              <div>
                <h3 style={{ fontWeight: 500, marginBottom: 4 }}>Change Password</h3>
                <p style={{ color: "#9CA3AF", fontSize: 14 }}>Update your account password</p>
              </div>
              <button style={{
                padding: "8px 16px",
                background: "transparent",
                color: "#8B5CF6",
                border: "1px solid #8B5CF6",
                borderRadius: 6,
                cursor: "pointer"
              }}>
                Change
              </button>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div style={{
          background: "rgba(30, 41, 59, 0.95)",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #374151"
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Subscription</h2>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontWeight: 500, marginBottom: 4 }}>Current Plan</h3>
              <p style={{ color: "#9CA3AF", fontSize: 14 }}>Free Plan</p>
            </div>
            <button style={{
              padding: "10px 20px",
              background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500
            }}>
              Upgrade
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <div style={{
          background: "rgba(30, 41, 59, 0.95)",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #374151"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontWeight: 500, marginBottom: 4 }}>Sign Out</h3>
              <p style={{ color: "#9CA3AF", fontSize: 14 }}>Sign out of your account</p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 20px",
                background: "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 