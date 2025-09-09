import { authService } from "./authService";
import {
  generateVideoThumbnail,
  isVideoThumbnailSupported,
} from "../utils/videoThumbnailGenerator";

function normalizeBase(url) {
  // default to Vite proxy path if no env provided
  const raw = url || "/api";
  // remove trailing slash
  const trimmed = raw.replace(/\/+$/, "");
  // if a full URL without /api, append it; if it already ends with /api, keep it
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
  // relative ('/api' style) is fine
  return trimmed;
}

function joinURL(base, path) {
  return `${base}/${path.replace(/^\/+/, "")}`;
}

class ProjectService {
  constructor() {
    // Use direct backend URL if provided; otherwise rely on Vite proxy (/api)
    this.baseURL = normalizeBase(import.meta.env.VITE_API_URL);
  }

  getAuthHeaders() {
    const token = authService?.getToken?.();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async handleResponse(response) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // ignore JSON parse error; we'll throw below if not ok
    }
    if (!response.ok) {
      const msg =
        (payload && (payload.message || payload.error)) ||
        `HTTP ${response.status}`;
      throw new Error(msg);
    }
    return payload ?? {};
  }

  // ---------- Projects CRUD ----------

  async createProject(projectData) {
    const res = await fetch(joinURL(this.baseURL, "projects"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(projectData),
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  async getProjects(options = {}) {
    const qs = new URLSearchParams();
    if (options.page) qs.append("page", options.page);
    if (options.limit) qs.append("limit", options.limit);
    if (options.sort) qs.append("sort", options.sort);
    if (options.order) qs.append("order", options.order);
    if (options.filter) qs.append("filter", JSON.stringify(options.filter));

    const url = joinURL(this.baseURL, `projects?${qs.toString()}`);
    const res = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  async getRecentProjects(limit = 5) {
    const url = joinURL(this.baseURL, `projects/recent?limit=${limit}`);
    const res = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  async getFavoriteProjects() {
    const url = joinURL(this.baseURL, "projects/favorites");
    const res = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  async getProject(projectId) {
    const url = joinURL(this.baseURL, `projects/${projectId}`);
    const res = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  async updateProject(projectId, updateData) {
    const url = joinURL(this.baseURL, `projects/${projectId}`);
    const res = await fetch(url, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(updateData),
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  async deleteProject(projectId) {
    const url = joinURL(this.baseURL, `projects/${projectId}`);
    const res = await fetch(url, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    const result = await this.handleResponse(res);
    return result;
  }

  async toggleFavorite(projectId) {
    const url = joinURL(this.baseURL, `projects/${projectId}/favorite`);
    const res = await fetch(url, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  async updateProjectStatus(projectId, status) {
    const url = joinURL(this.baseURL, `projects/${projectId}/status`);
    const res = await fetch(url, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  async duplicateProject(projectId) {
    const url = joinURL(this.baseURL, `projects/${projectId}/duplicate`);
    const res = await fetch(url, {
      method: "POST",
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  async searchProjects(searchTerm, options = {}) {
    const qs = new URLSearchParams({ q: searchTerm });
    if (options.sort) qs.append("sort", options.sort);
    if (options.order) qs.append("order", options.order);

    const url = joinURL(this.baseURL, `projects/search?${qs.toString()}`);
    const res = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    const result = await this.handleResponse(res);
    return result.data;
  }

  // ---------- Save/Load with localStorage fallback ----------

  async saveProject(projectData, fallbackToLocalStorage = true) {
    try {
      // Auto-generate thumbnail if possible
      let projectWithThumbnail = { ...projectData };
      if (
        !projectData.thumbnail &&
        projectData.videoData &&
        isVideoThumbnailSupported()
      ) {
        try {
          const videoUrl =
            projectData.videoData.url || projectData.videoData.src;
          if (videoUrl) {
            const thumbnail = await generateVideoThumbnail(
              videoUrl,
              1,
              160,
              90
            );
            projectWithThumbnail.thumbnail = thumbnail;
          }
        } catch (e) {
          console.warn("Failed to generate thumbnail:", e);
        }
      }

      if (projectWithThumbnail._id || projectWithThumbnail.id) {
        const id = projectWithThumbnail._id || projectWithThumbnail.id;
        return await this.updateProject(id, projectWithThumbnail);
      } else {
        return await this.createProject(projectWithThumbnail);
      }
    } catch (error) {
      console.error("Backend save failed:", error);
      if (fallbackToLocalStorage) {
        return this.saveToLocalStorage(projectData);
      }
      throw error;
    }
  }

  saveToLocalStorage(projectData) {
    const existing = JSON.parse(localStorage.getItem("vfxb_projects") || "[]");

    if (!projectData.id && !projectData._id) {
      projectData.id = Date.now();
    }

    const idx = existing.findIndex(
      (p) =>
        p.id === projectData.id ||
        p._id === projectData._id ||
        (p.video?.name === projectData.video?.name &&
          p.video?.size === projectData.video?.size)
    );

    let updated;
    if (idx !== -1) {
      existing[idx] = {
        ...existing[idx],
        ...projectData,
        updatedAt: new Date().toISOString(),
        lastModified: "Just now",
      };
      updated = existing;
    } else {
      updated = [
        {
          ...projectData,
          createdAt: projectData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastModified: "Just now",
        },
        ...existing,
      ];
    }

    localStorage.setItem("vfxb_projects", JSON.stringify(updated));
    localStorage.setItem(
      "vfxb_recent_projects",
      JSON.stringify(updated.slice(0, 3))
    );
    return projectData;
  }

  async loadProjects(fallbackToLocalStorage = true) {
    try {
      return await this.getProjects();
    } catch (error) {
      console.error("Backend load failed:", error);
      if (fallbackToLocalStorage) return this.loadFromLocalStorage();
      throw error;
    }
  }

  loadFromLocalStorage() {
    try {
      return JSON.parse(localStorage.getItem("vfxb_projects") || "[]");
    } catch {
      return [];
    }
  }

  async loadRecentProjects(fallbackToLocalStorage = true) {
    try {
      return await this.getRecentProjects();
    } catch (error) {
      console.error("Backend recent projects load failed:", error);
      if (fallbackToLocalStorage) return this.loadRecentFromLocalStorage();
      throw error;
    }
  }

  loadRecentFromLocalStorage() {
    try {
      return JSON.parse(localStorage.getItem("vfxb_recent_projects") || "[]");
    } catch {
      return [];
    }
  }
}

const projectService = new ProjectService();
export { projectService };
export default projectService;
