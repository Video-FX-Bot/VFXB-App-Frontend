import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Clock,
  Star,
  Trash2,
  Edit3,
  Copy,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../../useAuth";
import { projectService } from "../../services/projectService";
import {
  generateVideoThumbnail,
  isVideoThumbnailSupported,
} from "../../utils/videoThumbnailGenerator";

// API URL for thumbnail loading
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Thumbnail component with error handling
const ProjectThumbnail = ({ thumb, name, EMPTY_THUMB }) => {
  const [hasError, setHasError] = useState(false);

  if (!thumb || thumb === EMPTY_THUMB || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-600/20">
        <Video className="w-4 h-4 lg:w-5 lg:h-5 text-pink-400" />
      </div>
    );
  }

  return (
    <img
      src={thumb}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => {
        console.error("Failed to load thumbnail:", thumb);
        setHasError(true);
      }}
    />
  );
};

/* ---------------- helpers (avoid undefined crashes) ---------------- */

const getProjectId = (p) => p?._id ?? p?.id ?? null;
const safeStr = (v, fb = "") => (typeof v === "string" ? v : fb);
const capFirst = (v, fb = "") =>
  typeof v === "string" && v.length
    ? v.charAt(0).toUpperCase() + v.slice(1)
    : fb;
const safeStatus = (s) => (typeof s === "string" && s.length ? s : "draft");

const getStatusColor = (status) => {
  switch (safeStatus(status)) {
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

const EMPTY_THUMB =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

/* ------------------------------------------------------------------- */

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projectMenuOpen, setProjectMenuOpen] = useState(null);
  const [projects, setProjects] = useState([]);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState("");

  // polling guards
  const pollRef = useRef(null);
  const aliveRef = useRef(true);

  // Generate thumbnail for a project if it has video data but no thumbnail
  const generateThumbnailForProject = async (project) => {
    // Backend now generates thumbnails automatically, so just return the project as-is
    return project;
  };

  // Load recent projects with graceful fallbacks and **auth-aware polling**
  useEffect(() => {
    aliveRef.current = true;

    const loadRecentProjects = async () => {
      try {
        const recent = await projectService.loadRecentProjects();
        const list = Array.isArray(recent) ? recent : [];

        if (!aliveRef.current) return;

        if (list.length === 0) {
          // No projects - show empty state
          setProjects([]);
        } else {
          const processed = await Promise.all(
            list.map((p) => generateThumbnailForProject(p))
          );
          if (aliveRef.current) setProjects(processed);
        }
      } catch (error) {
        // If unauthorized bubbles up, stop polling and go to login
        if (error?.name === "AuthError") {
          stopPolling();
          navigate("/login");
        }
        if (aliveRef.current) setProjects([]);
      }
    };

    const startPolling = () => {
      stopPolling(); // clear any previous interval
      loadRecentProjects(); // immediate fetch
      pollRef.current = setInterval(loadRecentProjects, 5000);
    };

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    // Only poll when logged in
    if (user) startPolling();
    else stopPolling();

    // react to one-time broadcast from projectService on 401
    const onUnauthorized = () => {
      stopPolling();
      navigate("/login");
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);

    // Refresh list if other tabs change storage (but only when logged in)
    const onStorage = () => {
      if (user) {
        startPolling();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      aliveRef.current = false;
      stopPolling();
      window.removeEventListener("auth:unauthorized", onUnauthorized);
      window.removeEventListener("storage", onStorage);
    };
  }, [user, navigate]);

  const sidebarItems = useMemo(
    () => [
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
    ],
    [location.pathname]
  );

  const handleProjectAction = async (action, pid) => {
    const project = projects.find((p) => getProjectId(p) === pid);

    switch (action) {
      case "open": {
        if (!project) break;
        const uploadedVideo = project.video ||
          project.videoData || {
            name: safeStr(project.name, "Untitled Project"),
            url: project.thumbnail || EMPTY_THUMB,
            size: 0,
            type: "video/mp4",
          };

        navigate("/ai-editor", {
          state: { uploadedVideo, projectData: project },
        });
        setIsSidebarOpen(false);
        break;
      }

      case "rename": {
        if (!project) break;
        setEditingProjectId(pid);
        setEditingProjectName(safeStr(project.name, ""));
        break;
      }

      case "duplicate": {
        if (!project) break;
        try {
          const newProject = {
            ...project,
            id: undefined,
            _id: undefined,
            name: `${safeStr(project.name, "Untitled Project")} (Copy)`,
            lastModified: "Just now",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await projectService.saveProject(newProject);
          const recent = await projectService.loadRecentProjects();
          setProjects(Array.isArray(recent) ? recent : []);
        } catch (e) {
          console.error("Duplicate failed:", e);
        }
        break;
      }

      case "favorite": {
        if (!project) break;
        try {
          const updatedProject = {
            ...project,
            favorite: !project.favorite,
            lastModified: "Just now",
            updatedAt: new Date().toISOString(),
          };
          await projectService.saveProject(updatedProject);
          setProjects((prev) =>
            prev.map((p) => (getProjectId(p) === pid ? updatedProject : p))
          );
        } catch (e) {
          console.error("Favorite toggle failed:", e);
        }
        break;
      }

      case "delete": {
        if (!project) break;
        try {
          const delId = getProjectId(project);
          if (delId != null) {
            await projectService.deleteProject(delId);
          }
        } catch (e) {
          // ignore backend delete errors and still remove locally
          console.error("Delete failed (ignored locally):", e);
        } finally {
          setProjects((prev) => prev.filter((p) => getProjectId(p) !== pid));
        }
        break;
      }

      default:
        console.log(`${action} project ${pid}`);
    }

    setProjectMenuOpen(null);
  };

  const handleCreateProject = () => {
    navigate("/");
    setIsSidebarOpen(false);
  };

  const handleRenameSave = async (pid) => {
    const nextName = editingProjectName.trim();
    if (nextName === "") {
      setEditingProjectId(null);
      setEditingProjectName("");
      return;
    }

    try {
      const project = projects.find((p) => getProjectId(p) === pid);
      if (project) {
        const updatedProject = {
          ...project,
          name: nextName,
          lastModified: "Just now",
          updatedAt: new Date().toISOString(),
        };
        await projectService.saveProject(updatedProject);
        setProjects((prev) =>
          prev.map((p) => (getProjectId(p) === pid ? updatedProject : p))
        );
      }
    } catch (e) {
      console.error("Rename failed:", e);
    }
    setEditingProjectId(null);
    setEditingProjectName("");
  };

  const handleRenameCancel = () => {
    setEditingProjectId(null);
    setEditingProjectName("");
  };

  const list = Array.isArray(projects) ? projects : [];

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
              className={`${
                isSidebarOpen ? "inline" : "hidden lg:inline"
              } text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent`}
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
                    isSidebarOpen
                      ? "justify-start"
                      : "justify-center lg:justify-start"
                  } focus:outline-none ${
                    item.active
                      ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-foreground border border-pink-500/30"
                      : "text-muted-foreground hover:!text-foreground hover:bg-white/10"
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span
                    className={`${
                      isSidebarOpen ? "inline" : "hidden lg:inline"
                    } font-medium text-sm lg:text-base`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Recent Projects */}
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
              {list.length === 0 ? (
                <div className="text-center py-6 lg:py-8">
                  <p className="text-xs lg:text-sm text-muted-foreground">
                    No projects yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click the + button to create your first project
                  </p>
                </div>
              ) : (
                list.map((project) => {
                  const pid = getProjectId(project);
                  const name = safeStr(project?.name, "Untitled Project");
                  // Prepend API_URL if thumbnail is a relative path
                  const rawThumb = project?.thumbnail || EMPTY_THUMB;
                  const thumb =
                    rawThumb &&
                    rawThumb !== EMPTY_THUMB &&
                    rawThumb.startsWith("/")
                      ? `${API_URL}${rawThumb}`
                      : rawThumb;
                  const status = safeStatus(project?.status);
                  const duration = safeStr(project?.duration, "—");

                  return (
                    <motion.div
                      key={pid ?? name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative"
                    >
                      <div
                        onClick={() => {
                          if (pid != null) handleProjectAction("open", pid);
                          setIsSidebarOpen(false);
                        }}
                        className="bg-muted rounded-lg p-3 hover:bg-muted/80 transition-colors cursor-pointer relative"
                      >
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                            <ProjectThumbnail
                              thumb={thumb}
                              name={name}
                              EMPTY_THUMB={EMPTY_THUMB}
                            />
                          </div>

                          <div
                            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full z-10 ${getStatusColor(
                              status
                            )}`}
                          />

                          {project?.favorite && (
                            <div className="absolute -top-1 -left-1 z-10">
                              <Star className="w-3 h-3 text-yellow-400" />
                            </div>
                          )}

                          {/* Project Info */}
                          <div className="flex-1 min-w-0">
                            {editingProjectId === pid ? (
                              <input
                                type="text"
                                value={editingProjectName}
                                onChange={(e) =>
                                  setEditingProjectName(e.target.value)
                                }
                                onBlur={() => handleRenameSave(pid)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameSave(pid);
                                  if (e.key === "Escape") handleRenameCancel();
                                }}
                                className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                autoFocus
                              />
                            ) : (
                              <>
                                <h4 className="text-xs lg:text-sm font-medium text-foreground truncate group-hover:text-pink-300 transition-colors">
                                  {name}
                                </h4>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                  <div className="flex items-center space-x-1 lg:space-x-2">
                                    <Clock className="w-2 h-2 lg:w-3 lg:h-3" />
                                    <span className="text-xs">{duration}</span>
                                  </div>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      status === "completed"
                                        ? "bg-success-light text-success-light border border-green-500/30"
                                        : status === "draft"
                                        ? "bg-warning-light text-warning-light border border-yellow-500/30"
                                        : status === "processing"
                                        ? "bg-info-light text-info-light border border-blue-500/30"
                                        : "bg-muted text-muted-foreground border border-border"
                                    }`}
                                  >
                                    {capFirst(status, "Draft")}
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
                                projectMenuOpen === pid ? null : pid
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Project Menu */}
                        {projectMenuOpen === pid && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute right-2 top-12 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[140px] bg-card"
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleProjectAction("open", pid);
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
                                setEditingProjectId(pid);
                                setEditingProjectName(name);
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
                                handleProjectAction("duplicate", pid);
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
                                handleProjectAction("favorite", pid);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            >
                              <Star className="w-4 h-4" />
                              {project?.favorite
                                ? "Remove from Favorites"
                                : "Add to Favorites"}
                            </button>
                            <hr className="border-border my-1" />
                            <button
                              data-action="delete"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleProjectAction("delete", pid);
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
                  );
                })
              )}
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
                  {safeStr(user?.name, "User")}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {safeStr(user?.email, "")}
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
