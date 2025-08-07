import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, User as UserIcon, History, Sun, Moon } from "lucide-react";
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

const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useUI();
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

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest(".notifications-menu")) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notificationsOpen]);
  
  return (
    <header 
      className="h-14 sm:h-16 bg-card text-foreground flex items-center justify-end px-4 sm:px-6 border-b border-border"
      style={{
        background: `hsl(var(--card))`,
        color: `hsl(var(--foreground))`,
        borderBottom: `1px solid hsl(var(--border))`
      }}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          className="bg-gradient-to-r from-[#06b6d4] to-[#8b5cf6] text-white font-semibold border-0 shadow-none hover:from-[#22d3ee] hover:to-[#a78bfa] text-xs sm:text-sm px-2 sm:px-3 py-1"
        >
          <span className="hidden sm:inline">Upgrade</span>
          <span className="sm:hidden">+</span>
        </Button>
        
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
        
        <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground hidden sm:block">
          <History className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        
        <button 
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative flex items-center justify-center"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: 0,
                right: 0,
                background: "#EF4444",
                color: "white",
                borderRadius: "50%",
                width: 18,
                height: 18,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                lineHeight: 1,
                textAlign: "center",
                padding: 0,
                margin: 0
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          
          <div className="notifications-menu fixed border border-border rounded shadow-lg z-50 w-[280px] sm:w-[380px] max-h-[400px] sm:max-h-[500px] overflow-y-auto" style={{ 
            display: notificationsOpen ? "block" : "none",
            top: "56px",
            right: "16px",
            background: "hsl(var(--card))",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontWeight: 600, fontSize: 16, color: "hsl(var(--foreground))" }}>Notifications</h3>
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
                <div style={{ padding: "24px", textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid hsl(var(--border))",
                      cursor: "pointer",
                      background: notification.read ? "transparent" : "rgba(139, 92, 246, 0.1)",
                      transition: "background 0.15s ease-in-out"
                    }}
                    className="notification-item"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div 
                          className={`notification-title ${notification.read ? 'read' : ''}`}
                          style={{ 
                            fontWeight: notification.read ? 400 : 600,
                            fontSize: 15,
                            marginBottom: 6
                          }}
                        >
                          {notification.title}
                        </div>
                        <div 
                          className="notification-description"
                          style={{ 
                            fontSize: 13,
                            lineHeight: 1.5
                          }}
                        >
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
                       color: "#9CA3AF",
                       marginTop: 6
                     }}>
                      {notification.time}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        
        <div className="w-px h-6 bg-border" />
        
        <button 
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/profile")}
        >
          <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
};

export default function Layout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useUI();

  return (
    <>
      <style>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        .pink-glow { 
          color: #F472B6; 
          text-shadow: 0 0 8px #F472B6, 0 0 16px #F472B6; 
        }
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
        .dark .notification-item:hover {
          background: rgba(139, 92, 246, 0.1) !important;
        }
        /* Dark theme notification text colors */
        .dark .notification-title {
          color:rgb(229, 235, 229) !important;
        }
        .dark .notification-title.read {
          color: #6B7280 !important;
        }
        .dark .notification-description {
          color: #6B7280 !important;
        }
        /* Light theme notification text colors */
        .notification-title {
          color: #374151 !important;
        }
        .notification-title.read {
          color: #6B7280 !important;
        }
        .notification-description {
          color: #1F2937 !important;
        }
      `}</style>
      <div 
        className="h-screen flex text-foreground bg-background overflow-hidden"
        style={{
          background: `hsl(var(--background))`,
          color: `hsl(var(--foreground))`
        }}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main 
            className="flex-1 p-4 sm:p-6 overflow-y-auto bg-background"
            style={{
              background: `hsl(var(--background))`,
              color: `hsl(var(--foreground))`
            }}
          >
            <div className="w-full max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
