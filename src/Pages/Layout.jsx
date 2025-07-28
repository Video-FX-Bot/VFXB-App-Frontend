import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Boxes, History, Bell, User as UserIcon, Plus, MoreVertical } from "lucide-react";
import { useAuth } from "../useAuth";

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

const Sidebar = ({ projects, isLoading, onProjectAction, editingProject, editName, setEditName, onRenameSave, onRenameCancel }) => {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const currentProjectId = urlParams.get("id");
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(null);

  const handleProfileClick = () => {
    setMenuOpen((open) => !open);
  };

  const handleSignOut = () => {
    logout();
    setMenuOpen(false);
    navigate("/login");
  };

  const handleProfileNav = () => {
    setMenuOpen(false);
    navigate("/profile");
  };

  const handleCreateProject = () => {
    navigate("/");
  };

  const handleProjectMenuClick = (projectId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectMenuOpen(projectMenuOpen === projectId ? null : projectId);
  };

  const handleProjectAction = (action, projectId) => {
    console.log('Sidebar handleProjectAction called:', action, projectId);
    setProjectMenuOpen(null);
    onProjectAction(action, projectId);
  };

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpen && projectMenuOpen === null) return;
    const handleClick = (e) => {
      if (!e.target.closest(".profile-menu") && !e.target.closest(".project-menu")) {
        setMenuOpen(false);
        setProjectMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, projectMenuOpen]);

  return (
    <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col border-r border-gray-700">
      <div className="p-4">
        <Link
          to={createPageUrl("Home")}
          className="text-2xl font-bold tracking-wider gradient-text"
        >
          VFXB
        </Link>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-md">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-white">Projects</h2>
            </div>
            <button
              onClick={handleCreateProject}
              className="hover:bg-gray-700 p-1 rounded transition-colors"
              title="Create New Project"
            >
              <Plus className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        <nav className="space-y-3">
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <Link
                to={`/Editor?id=${project.id}`}
                className={`block w-full text-left p-3 rounded-lg transition-all duration-150 ${
                  currentProjectId === project.id
                    ? "bg-[#333333] text-white border-l-4 border-pink-500"
                    : "hover:bg-gray-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{project.thumbnail}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      {editingProject === project.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onRenameSave(project.id);
                              if (e.key === 'Escape') onRenameCancel();
                            }}
                            className="text-sm font-medium bg-transparent border-b border-gray-500 focus:border-pink-500 outline-none w-32"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <h3 className="text-sm font-medium truncate">{project.name}</h3>
                      )}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => handleProjectMenuClick(project.id, e)}
                          className="project-menu p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>
                        
                        {projectMenuOpen === project.id && (
                          <div className="project-menu absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-[120px] max-w-[200px]">
                            <button
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-white"
                              onClick={() => handleProjectAction('rename', project.id)}
                            >
                              Rename
                            </button>
                            <button
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-white"
                              onClick={() => handleProjectAction('export', project.id)}
                            >
                              Export
                            </button>
                            <button
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-white"
                              onClick={() => handleProjectAction('duplicate', project.id)}
                            >
                              Duplicate
                            </button>
                            <div className="border-t border-gray-700"></div>
                            <button
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-red-400"
                              onClick={() => handleProjectAction('delete', project.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 space-y-0.5">
                      <div>{project.lastModified}</div>
                      <div>{project.size} • {project.duration}</div>
                      <div className={`text-xs px-1.5 py-0.5 rounded-full inline-block ${
                        project.status === 'Complete' ? 'bg-green-900 text-green-300' :
                        project.status === 'Processing' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {project.status}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 relative">
          <button
            className="focus:outline-none flex items-center gap-3"
            onClick={handleProfileClick}
            style={{ background: "none", border: "none", padding: 0 }}
          >
            <Avatar>
              <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "G"}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-white">
              {isLoggedIn && user?.email ? user.email : "Guest"}
            </span>
          </button>
          {menuOpen && (
            <div className="profile-menu absolute left-0 bottom-12 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-[140px]">
              <button
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-white"
                onClick={handleProfileNav}
              >
                Profile
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-red-400"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

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
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState("");

  // Mocked project list for now
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setProjects([
        { 
          id: "1", 
          name: "Project One",
          lastModified: "2 hours ago",
          size: "45.2 MB",
          duration: "2:34",
          thumbnail: "🎬",
          status: "Complete"
        },
        { 
          id: "2", 
          name: "Project Two",
          lastModified: "1 day ago",
          size: "128.7 MB",
          duration: "5:12",
          thumbnail: "🎥",
          status: "Processing"
        },
        { 
          id: "3", 
          name: "Project Three",
          lastModified: "3 days ago",
          size: "67.3 MB",
          duration: "1:45",
          thumbnail: "📹",
          status: "Draft"
        },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleProjectAction = (action, projectId) => {
    console.log('handleProjectAction called:', action, projectId);
    switch(action) {
      case 'rename': {
        const project = projects.find(p => p.id === projectId);
        console.log('Renaming project:', project);
        setEditingProject(projectId);
        setEditName(project.name);
        break;
      }
      case 'export':
        // Handle export
        console.log('Export project:', projectId);
        break;
      case 'duplicate': {
        const projectToDuplicate = projects.find(p => p.id === projectId);
        console.log('Duplicating project:', projectToDuplicate);
        const newProject = {
          ...projectToDuplicate,
          id: Date.now().toString(),
          name: `${projectToDuplicate.name} (Copy)`,
          lastModified: "Just now",
          status: "Draft"
        };
        setProjects(prev => [...prev, newProject]);
        break;
      }
      case 'delete':
        console.log('Deleting project:', projectId);
        if (window.confirm('Are you sure you want to delete this project?')) {
          setProjects(prev => prev.filter(p => p.id !== projectId));
        }
        break;
    }
  };

  const handleRenameSave = (projectId) => {
    if (editName.trim()) {
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, name: editName.trim(), lastModified: "Just now" } : p
      ));
    }
    setEditingProject(null);
    setEditName("");
  };

  const handleRenameCancel = () => {
    setEditingProject(null);
    setEditName("");
  };

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
        <Sidebar 
          projects={projects} 
          isLoading={isLoading} 
          onProjectAction={handleProjectAction} 
          editingProject={editingProject} 
          editName={editName} 
          setEditName={setEditName} 
          onRenameSave={handleRenameSave} 
          onRenameCancel={handleRenameCancel}
        />
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
