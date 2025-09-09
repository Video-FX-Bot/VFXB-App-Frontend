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
  X, // close button inside header (mobile)
} from "lucide-react";
import { useAuth } from "../../useAuth";
import { projectService } from "../../services/projectService";
import {
  generateVideoThumbnail,
  isVideoThumbnailSupported,
} from "../../utils/videoThumbnailGenerator";

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeMenu, setActiveMenu] = useState(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(null);
  const [projects, setProjects] = useState([]);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState("");

  // Generate thumbnail for a project if it has video data but no thumbnail
  const generateThumbnailForProject = async (project) => {
    if (!project.thumbnail && project.videoData && isVideoThumbnailSupported()) {
      try {
        const videoUrl = project.videoData.url || project.videoData.src;
        if (videoUrl) {
          const thumbnail = await generateVideoThumbnail(videoUrl, 1, 160, 90);
          const updatedProject = {
            ...project,
            thumbnail,
            lastModified: "Just now",
            updatedAt: new Date().toISOString(),
          };
          await projectService.saveProject(updatedProject);
          return updatedProject;
        }
      } catch (error) {
        console.warn("Failed to generate thumbnail for project:", project.name, error);
      }
    }
    return project;
  };

  // Load recent projects from backend API with localStorage fallback
  useEffect(() => {
    const loadRecentProjects = async () => {
      try {
        const recentProjects = await projectService.loadRecentProjects();

        if (recentProjects.length === 0) {
          // Default recent projects if none saved
          const defaultProjects = [
            {
              id: 1,
              name: "Summer Vacation Video",
              thumbnail:
                "https://images.pexels.com/photos/1144275/pexels-photo-1144275.jpeg?auto=compress&cs=tinysrgb&w=160",
              duration: "2:45",
              lastModified: "2 hours ago",
              status: "completed",
            },
            {
              id: 2,
              name: "Product Demo",
              thumbnail:
                "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=160",
              duration: "1:30",
              lastModified: "1 day ago",
              status: "draft",
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
              status: "draft",
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
          const processedProjects = await Promise.all(
            recentProjects.map(async (project) => await generateThumbnailForProject(project))
          );
          setProjects(processedProjects);
        }
      } catch (error) {
        console.error("Error loading recent projects:", error);
        setProjects([]);
      }
    };

    loadRecentProjects();

    // Listen for storage changes to update recent projects
    const handleStorageChange = () => {
      loadRecentProjects();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also check for updates every 5 seconds (reduced frequency for API calls)
    const interval = setInterval(loadRecentProjects, 5000);

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

  const handleProjectAction = async (action, projectId) => {
    const project = projects.find(
      (p) => p.id === projectId || p._id === projectId
    );

    switch (action) {
      case "open":
        if (project) {
          navigate("/ai-editor", {
            state: {
              uploadedVideo:
                project.video ||
                project.videoData || {
                  name: project.name,
                  url: project.thumbnail,
                  size: 0,
                  type: "video/mp4",
                },
              projectData: project,
            },
          });
          setIsSidebarOpen(false);
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
          try {
            const newProject = {
              ...project,
              id: undefined,
              _id: undefined,
              name: `${project.name} (Copy)`,
              lastModified: "Just now",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await projectService.saveProject(newProject);
            const recentProjects = await projectService.loadRecentProjects();
            setProjects(recentProjects);
          } catch (error) {
            console.error("Error duplicating project:", error);
          }
        }
        break;
      case "favorite":
        if (project) {
          try {
            const updatedProject = {
              ...project,
              favorite: !project.favorite,
              lastModified: "Just now",
              updatedAt: new Date().toISOString(),
            };
            await projectService.saveProject(updatedProject);
            const updatedProjects = projects.map((p) =>
              p.id === projectId || p._id === projectId ? updatedProject : p
            );
            setProjects(updatedProjects);
          } catch (error) {
            console.error("Error updating project favorite status:", error);
          }
        }
        break;
      case "delete":
        if (project) {
          try {
            const projectIdToDelete = project._id || project.id;
            if (projectIdToDelete) {
              await projectService.deleteProject(projectIdToDelete);
            }
            const updatedProjects = projects.filter(
              (p) => p.id !== projectId && p._id !== projectId
            );
            setProjects(updatedProjects);
          } catch (error) {
            console.error("Error deleting project:", error);
            const updatedProjects = projects.filter(
              (p) => p.id !== projectId && p._id !== projectId
            );
            setProjects(updatedProjects);
          }
        }
        break;
      default:
        console.log(`${action} project ${projectId}`);
    }
    setProjectMenuOpen(null);
  };

  const handleCreateProject = () => {
    navigate("/");
    setIsSidebarOpen(false);
  };

  const handleRenameSave = async (projectId) => {
    if (editingProjectName.trim() !== "") {
      try {
        const project = projects.find(
          (p) => p.id === projectId || p._id === projectId
        );
        if (project) {
          const updatedProject = {
            ...project,
            name: editingProjectName.trim(),
            lastModified: "Just now",
            updatedAt: new Date().toISOString(),
          };
          await projectService.saveProject(updatedProject);
          const updatedProjects = projects.map((p) =>
            p.id === projectId || p._id === projectId ? updatedProject : p
          );
          setProjects(updatedProjects);
        }
      } catch (error) {
        console.error("Error renaming project:", error);
      }
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
      case "draft":
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
    <>
      {/* Off-canvas sidebar */}
      <aside
        className={`w-64 bg-card border-r border-border flex flex-col h-full overflow-hidden
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:relative`}
        style={{
          background: `hsl(var(--card))`,
          borderRight: `1px solid hsl(var(--border))`,
        }}
      >
        {/* Header / Logo */}
        <div className="h-14 md:h-16 border-b border-border px-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3"
            onClick={() => setIsSidebarOpen(false)}
          >
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span
              className={`${isSidebarOpen ? "inline" : "hidden lg:inline"} text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent`}
            >
              VFXB
            </span>
          </Link>

          {/* Close button (mobile) */}
          {isSidebarOpen && (
            <button
              type="button"
              aria-label="Close menu"
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          )}
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
                  className={`flex items-center space-x-2 lg:space-x-3 px-2 sm:px-3 py-2 rounded-lg transition-all duration-100 group ${
                    isSidebarOpen ? "justify-start" : "justify-center lg:justify-start"
                  } focus:outline-none ${
                    item.active
                      ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-foreground border border-pink-500/30"
                      : "text-muted-foreground hover:!text-foreground hover:bg-white/10"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span
                    className={`${isSidebarOpen ? "inline" : "hidden lg:inline"} font-medium text-sm lg:text-base`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Recent Projects (kept as in your original) */}
          <div className="mt-4 lg:mt-8 hidden lg:block">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <h3 className="text-xs lg:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Projects
              </h3>
              <button
                onClick={handleCreateProject}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
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
                    onClick={() => {
                      handleProjectAction("open", project.id);
                      setIsSidebarOpen(false);
                    }}
                    className="bg-muted rounded-lg p-3 hover:bg-muted/80 transition-colors cursor-pointer relative"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                        <img
                          src={project.thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full z-10 ${getStatusColor(
                          project.status
                        )}`}
                      />
                      {project.favorite && (
                        <div className="absolute -top-1 -left-1 z-10">
                          <Star className="w-3 h-3 text-yellow-400" />
                        </div>
                      )}

                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        {editingProjectId === project.id ? (
                          <input
                            type="text"
                            value={editingProjectName}
                            onChange={(e) =>
                              setEditingProjectName(e.target.value)
                            }
                            onBlur={() => handleRenameSave(project.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameSave(project.id);
                              if (e.key === "Escape") handleRenameCancel();
                            }}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h4 className="text-xs lg:text-sm font-medium text-foreground truncate group-hover:text-pink-300 transition-colors">
                              {project.name}
                            </h4>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1 lg:space-x-2">
                                <Clock className="w-2 h-2 lg:w-3 lg:h-3" />
                                <span className="text-xs">
                                  {project.duration}
                                </span>
                              </div>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  project.status === "completed"
                                    ? "bg-success-light text-success-light border border-green-500/30"
                                    : project.status === "draft"
                                    ? "bg-warning-light text-warning-light border border-yellow-500/30"
                                    : project.status === "processing"
                                    ? "bg-info-light text-info-light border border-blue-500/30"
                                    : "bg-muted text-muted-foreground border border-border"
                                }`}
                              >
                                {project.status.charAt(0).toUpperCase() +
                                  project.status.slice(1)}
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
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Project Menu */}
                    {projectMenuOpen === project.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-2 top-12 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[140px] bg-card"
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleProjectAction("open", project.id);
                            setIsSidebarOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Open
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingProjectId(project.id);
                            setEditingProjectName(project.name);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
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
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
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
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Star className="w-4 h-4" />
                          {project.favorite
                            ? "Remove from Favorites"
                            : "Add to Favorites"}
                        </button>
                        <hr className="border-border my-1" />
                        <button
                          data-action="delete"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleProjectAction("delete", project.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-destructive text-destructive hover:text-destructive-foreground flex items-center gap-2"
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
              className="hidden lg:block mt-3 lg:mt-4 text-center text-xs lg:text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              View All Projects →
            </Link>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-2 sm:p-3 lg:p-4 border-t border-border">
          {user ? (
            <div className="group flex items-center space-x-2 lg:space-x-3 p-1 lg:p-2 rounded-lg hover:bg-muted transition-all duration-200 cursor-pointer relative">
              <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 hidden lg:block">
                <p className="text-xs lg:text-sm font-medium text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                navigate("/login");
                setIsSidebarOpen(false);
              }}
              className="w-full px-2 lg:px-4 py-2 text-xs lg:text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 hover:shadow-elevation-2"
            >
              <span className="hidden lg:inline">Log In</span>
              <span className="lg:hidden">+</span>
            </button>
          )}
        </div>
      </aside>

      {/* Scrim overlay (tap to close) — only on mobile when open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
