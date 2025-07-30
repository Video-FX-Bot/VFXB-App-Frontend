import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, User as UserIcon, History } from "lucide-react";
import { useAuth } from "../useAuth";
import { useUI } from "../hooks/useUI";
import Sidebar from "../components/layout/Sidebar";

// 🔧 Simple mock components to replace missing UI imports
const Button = ({ children, className = "", ...props }) => (
  <button
    className={`bg-pink-600 text-white rounded px-3 py-1 text-sm ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Avatar = ({ children }) => (
  <div className="h-9 w-9 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">
    {children}
  </div>
);

const AvatarFallback = ({ children }) => children;

// 🛠 createPageUrl mock (just returns a path for now)
const createPageUrl = (path) => (path === "Home" ? "/" : `/${path}`);

// Sidebar component is now imported from components/layout/Sidebar.jsx

const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "project",
      title: "Project One completed",
      message: "Your video has been processed successfully",
      time: "2 minutes ago",
      read: false
    },
    {
      id: 2,
      type: "system",
      title: "Welcome to VFXB!",
      message: "Get started by uploading your first video",
      time: "1 hour ago",
      read: false
    },
    {
      id: 3,
      type: "update",
      title: "New features available",
      message: "Check out our latest AI enhancements",
      time: "3 hours ago",
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Close notifications on outside click
  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest(".notifications-menu")) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notificationsOpen]);
  
  return (
    <header className="h-16 header-bg-gray-900 text-gray-300 flex items-center justify-end px-6 border-b border-gray-700">
      <div className="flex items-center gap-4">
        <Button
          className="bg-gradient-to-r from-[#06b6d4] to-[#8b5cf6] text-white font-semibold border-0 shadow-none hover:from-[#22d3ee] hover:to-[#a78bfa]"
        >
          Upgrade
        </Button>
        <button className="hover:text-white">
          <History className="w-5 h-5" />
        </button>
        <div className="relative flex items-center">
          <button 
            className="hover:text-white relative flex items-center justify-center"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: -6,
                right: -6,
                background: "#EF4444",
                color: "white",
                borderRadius: "50%",
                width: 18,
                height: 18,
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold"
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <div className="notifications-menu fixed bg-gray-800 border border-gray-700 rounded shadow-lg z-50 w-[380px] max-h-[500px] overflow-y-auto" style={{ 
            top: '4rem', 
            right: '1rem',
            maxWidth: 'calc(100vw - 2rem)',
            opacity: notificationsOpen ? 1 : 0,
            transform: notificationsOpen ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
            pointerEvents: notificationsOpen ? 'auto' : 'none'
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #374151" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontWeight: 600, fontSize: 16 }}>Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#8B5CF6",
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: 500
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            <div>
              {notifications.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#9CA3AF" }}>
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid #374151",
                      cursor: "pointer",
                      background: notification.read ? "transparent" : "rgba(139, 92, 246, 0.1)",
                      transition: "background 0.15s ease-in-out"
                    }}
                    className="notification-item"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: notification.read ? 400 : 600,
                          fontSize: 15,
                          marginBottom: 6,
                          color: notification.read ? "#9CA3AF" : "white"
                        }}>
                          {notification.title}
                        </div>
                        <div style={{ 
                          fontSize: 13,
                          color: "#9CA3AF",
                          lineHeight: 1.5
                        }}>
                          {notification.message}
                        </div>
                      </div>
                      {!notification.read && (
                        <div style={{
                          width: 10,
                          height: 10,
                          background: "#8B5CF6",
                          borderRadius: "50%",
                          marginLeft: 12,
                          flexShrink: 0
                        }} />
                      )}
                    </div>
                    <div style={{ 
                      fontSize: 12,
                      color: "#6B7280",
                      marginTop: 6
                    }}>
                      {notification.time}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="w-px h-6 bg-gray-700" />
        <button 
          className="hover:text-white"
          onClick={() => navigate("/profile")}
        >
          <UserIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default function Layout({ children }) {

  return (
    <>
      <style>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(-45deg, hsl(0 0% 5%), hsl(0 0% 15%), hsl(0 0% 5%), hsl(0 0% 15%));
          background-size: 400% 400%;
          color: #E0E0E0;
        }
        .pink-glow { color: #F472B6; text-shadow: 0 0 8px #F472B6, 0 0 16px #F472B6; }
        .gradient-text {
          background: linear-gradient(90deg, #06b6d4, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
        }
        .notification-item:hover {
          background: rgba(139, 92, 246, 0.05) !important;
        }
      `}</style>
      <div className="h-screen flex text-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="w-full max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
