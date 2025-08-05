import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderOpen,
  Video,
  Settings,
  User,
  Plus,
  MoreVertical,
  Play,
  Calendar,
  Clock,
  Star,
  Trash2,
  Edit3,
  Copy,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../useAuth";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(null);
  const [projects, setProjects] = useState([]);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState("");

  // Load recent projects from localStorage
  useEffect(() => {
    const loadRecentProjects = () => {
      const savedRecentProjects = JSON.parse(
        localStorage.getItem("vfxb_recent_projects") || "[]"
      );

      if (savedRecentProjects.length === 0) {
        // Default recent projects if none saved
        const defaultProjects = [
          {
            id: 1,
            name: "Summer Vacation Video",
            thumbnail:
              "https://images.pexels.com/photos/1144275/pexels-photo-1144275.jpeg?auto=compress&cs=tinysrgb&w=160",
            duration: "2:45",
            lastModified: "2 hours ago",
            status: "editing",
          },
          {
            id: 2,
            name: "Product Demo",
            thumbnail:
              "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=160",
            duration: "1:30",
            lastModified: "1 day ago",
            status: "completed",
          },
          {
            id: 3,
            name: "Wedding Highlights",
            thumbnail:
              "https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=160",
            duration: "3:20",
            lastModified: "3 days ago",
            status: "completed",
          },
          {
            id: 4,
            name: "Travel Vlog",
            thumbnail:
              "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=160",
            duration: "4:15",
            lastModified: "5 days ago",
            status: "editing",
          },
          {
            id: 5,
            name: "Corporate Training",
            thumbnail:
              "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=160",
            duration: "6:30",
            lastModified: "1 week ago",
            status: "completed",
          },
        ];
        setProjects(defaultProjects);
      } else {
        setProjects(savedRecentProjects);
      }
    };

    loadRecentProjects();

    // Listen for storage changes to update recent projects
    const handleStorageChange = () => {
      loadRecentProjects();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also check for updates every 2 seconds (for same-tab updates)
    const interval = setInterval(loadRecentProjects, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const sidebarItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
      active: location.pathname === "/" || location.pathname === "/dashboard",
    },
    {
      id: "ai-editor",
      label: "AI Editor",
      icon: Sparkles,
      path: "/ai-editor",
      active: location.pathname === "/ai-editor",
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderOpen,
      path: "/projects",
      active: location.pathname === "/projects",
    },
    {
      id: "templates",
      label: "Templates",
      icon: Video,
      path: "/templates",
      active: location.pathname === "/templates",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/settings",
      active: location.pathname === "/settings",
    },
  ];

  const handleProjectAction = (action, projectId) => {
    const project = projects.find((p) => p.id === projectId);

    switch (action) {
      case "open":
        if (project) {
          navigate("/ai-editor", {
            state: {
              uploadedVideo: project.video || {
                name: project.name,
                url: project.thumbnail,
                size: 0,
                type: "video/mp4",
              },
              projectData: project,
            },
          });
        }
        break;
      case "rename":
        if (project) {
          setEditingProjectId(projectId);
          setEditingProjectName(project.name);
        }
        break;
      case "duplicate":
        if (project) {
          const newProject = {
            ...project,
            id: Date.now(), // Generate new unique ID
            name: `${project.name} (Copy)`,
            lastModified: "Just now"
          };
          const updatedProjects = [newProject, ...projects];
          setProjects(updatedProjects);
          localStorage.setItem("vfxb_recent_projects", JSON.stringify(updatedProjects));
        }
        break;
      case "favorite":
        if (project) {
          const updatedProjects = projects.map(p => 
            p.id === projectId ? { ...p, favorite: !p.favorite } : p
          );
          setProjects(updatedProjects);
          localStorage.setItem("vfxb_recent_projects", JSON.stringify(updatedProjects));
        }
        break;
      case "delete":
        if (project) {
          const updatedProjects = projects.filter(p => p.id !== projectId);
          setProjects(updatedProjects);
          localStorage.setItem("vfxb_recent_projects", JSON.stringify(updatedProjects));
        }
        break;
      default:
        console.log(`${action} project ${projectId}`);
    }
    setProjectMenuOpen(null);
  };

  const handleCreateProject = () => {
    navigate("/");
  };

  const handleRenameSave = (projectId) => {
    if (editingProjectName.trim() !== "") {
      const updatedProjects = projects.map(p => 
        p.id === projectId ? { ...p, name: editingProjectName.trim() } : p
      );
      setProjects(updatedProjects);
      localStorage.setItem("vfxb_recent_projects", JSON.stringify(updatedProjects));
    }
    setEditingProjectId(null);
    setEditingProjectName("");
  };

  const handleRenameCancel = () => {
    setEditingProjectId(null);
    setEditingProjectName("");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "editing":
        return "bg-yellow-500";
      case "completed":
        return "bg-green-500";
      case "processing":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <aside className="w-16 sm:w-20 lg:w-64 bg-gray-900 border-r border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-700">
        <Link to="/" className="flex items-center space-x-2 lg:space-x-3">
          <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Video className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
          </div>
          <span className="hidden lg:block text-lg lg:text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
            VFXB
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 sm:p-3 lg:p-4 overflow-y-auto">
        <div className="space-y-1 sm:space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center space-x-2 lg:space-x-3 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 group justify-center lg:justify-start ${
                  item.active
                    ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/30"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden lg:block font-medium text-sm lg:text-base">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Recent Projects */}
        <div className="mt-4 lg:mt-8 hidden lg:block">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h3 className="text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Recent Projects
            </h3>
            <button
              onClick={handleCreateProject}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Create New Project"
            >
              <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
            </button>
          </div>

          <div className="space-y-1 lg:space-y-2">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative"
              >
                <div
                  onClick={() => handleProjectAction("open", project.id)}
                  className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div
                      className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(
                        project.status
                      )}`}
                    />
                    {project.favorite && (
                      <div className="absolute -top-1 -left-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                      </div>
                    )}

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      {editingProjectId === project.id ? (
                        <input
                          type="text"
                          value={editingProjectName}
                          onChange={(e) => setEditingProjectName(e.target.value)}
                          onBlur={() => handleRenameSave(project.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSave(project.id);
                            if (e.key === "Escape") handleRenameCancel();
                          }}
                          className="w-full bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-pink-500 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <>
                          <h4 className="text-xs lg:text-sm font-medium text-white truncate group-hover:text-pink-300 transition-colors">
                            {project.name}
                          </h4>
                          <div className="flex items-center space-x-1 lg:space-x-2 text-xs text-gray-400">
                            <Clock className="w-2 h-2 lg:w-3 lg:h-3" />
                            <span className="text-xs">{project.duration}</span>
                            <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                            <span className={`text-xs text-white ${getStatusColor(project.status)} px-2 py-1 rounded-full`}>
                              {project.status}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Menu Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectMenuOpen(
                          projectMenuOpen === project.id ? null : project.id
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-700 transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Project Menu */}
                  {projectMenuOpen === project.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-2 top-12 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleProjectAction("open", project.id);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Open
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleProjectAction("rename", project.id);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleProjectAction("duplicate", project.id);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleProjectAction("favorite", project.id);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        {project.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                      </button>
                      <hr className="border-gray-700 my-1" />
                      <button
                        data-action="delete"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleProjectAction("delete", project.id);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-red-600 text-red-400 hover:text-white flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* View All Projects */}
          <Link
            to="/projects"
            className="hidden lg:block mt-3 lg:mt-4 text-center text-xs lg:text-sm text-gray-400 hover:text-white transition-colors"
          >
            View All Projects →
          </Link>
        </div>
      </nav>
      {/* User Section */}
      <div className="p-2 sm:p-3 lg:p-4 border-t border-gray-700">
        {user ? (
          <div className="group flex items-center space-x-2 lg:space-x-3 p-1 lg:p-2 rounded-lg hover:bg-gray-800 transition-all duration-200 cursor-pointer relative">
            <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0 hidden lg:block">
              <p className="text-xs lg:text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="w-full px-2 lg:px-4 py-2 text-xs lg:text-sm font-medium bg-pink-600 text-white rounded-lg hover:bg-pink-500 transition"
          >
            <span className="hidden lg:inline">Log In</span>
            <span className="lg:hidden">+</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
