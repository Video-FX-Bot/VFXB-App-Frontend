import React, { useState } from "react";
import { useAuth } from "../useAuth";
import { useNavigate } from "react-router-dom";
import { useUI } from "../hooks/useUI";

export default function Profile() {
  const { user, isLoggedIn, logout } = useAuth();
  const { theme } = useUI();
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
      <div className="p-8 text-center">
        <h2 className="text-foreground">Please log in to view your profile</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-background">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Personal Information */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-elevation-2">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold text-foreground">Personal Information</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isEditing 
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-elevation-2 hover:shadow-elevation-3'
              }`}
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium text-sm text-foreground">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={!isEditing}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-base outline-none transition-all duration-300 focus:border-primary focus:shadow-lg focus:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-sm text-foreground">Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                disabled={!isEditing}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-base outline-none transition-all duration-300 focus:border-primary focus:shadow-lg focus:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-sm text-foreground">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                disabled={!isEditing}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-base outline-none transition-all duration-300 focus:border-primary focus:shadow-lg focus:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
              />
            </div>

            {isEditing && (
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-none rounded-lg font-medium transition-all duration-200 hover:shadow-elevation-2 hover:scale-105"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-elevation-2">
          <h2 className="text-xl font-semibold mb-5 text-foreground">Account Settings</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3">
              <div>
                <h3 className="font-medium mb-1 text-foreground">Email Notifications</h3>
                <p className="text-muted-foreground text-sm">Receive updates about your projects</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifications}
                  onChange={(e) => setFormData({...formData, notifications: e.target.checked})}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-all duration-300 relative ${
                  formData.notifications ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-muted'
                }`}>
                  <div className={`absolute top-1/2 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 transform -translate-y-1/2 ${
                    formData.notifications ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            </div>

            <div className="flex justify-between items-center py-3">
              <div>
                <h3 className="font-medium mb-1 text-foreground">Change Password</h3>
                <p className="text-muted-foreground text-sm">Update your account password</p>
              </div>
              <button className="px-4 py-2 bg-transparent text-primary border border-primary rounded-lg hover:bg-primary/10 transition-all duration-200">
                Change
              </button>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-elevation-2">
          <h2 className="text-xl font-semibold mb-5 text-foreground">Subscription</h2>
          
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium mb-1 text-foreground">Current Plan</h3>
              <p className="text-muted-foreground text-sm">Free Plan</p>
            </div>
            <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-none rounded-lg font-medium transition-all duration-200 hover:shadow-elevation-2 hover:scale-105">
              Upgrade
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-elevation-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium mb-1 text-foreground">Sign Out</h3>
              <p className="text-muted-foreground text-sm">Sign out of your account</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-none rounded-lg font-medium transition-all duration-200 hover:shadow-elevation-2 hover:scale-105"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 