import { authService } from "./authService";
import {
  generateVideoThumbnail,
  isVideoThumbnailSupported,
} from "../utils/videoThumbnailGenerator";

/* ---------------- URL helpers ---------------- */
let AUTH_INVALIDATED = false;
const emitUnauthorized = () => {
  try {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  } catch {}
};

function normalizeBase(url) {
  // prefer explicit envs; default to Vite proxy (/api)
  const raw = url || "/api";
  const trimmed = raw.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
  return trimmed; // '/api' style
}

function joinURL(base, path) {
  return `${base}/${String(path || "").replace(/^\/+/, "")}`;
}

/* ---------------- Small utils ---------------- */

class AuthError extends Error {
  constructor(message = "Unauthorized", status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const pick = (obj, ...keys) =>
  keys.reduce((o, k) => (obj && obj[k] != null ? ((o[k] = obj[k]), o) : o), {});

// Shapes we accept: {data}, {projects}, array, or object
function extractData(json, fallback = []) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.projects)) return json.projects;
  if (json && typeof json.data === "object") return json.data;
  return fallback;
}

/* ---------------- Core service ---------------- */

class ProjectService {
  constructor() {
    // accept either env name
    const envBase =
      import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
    this.baseURL = normalizeBase(envBase);
  }

  getAuthHeaders() {
    const token = authService?.getToken?.();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async parseResponse(res) {
    let json = null;
    try {
      json = await res.json();
    } catch {
      // allow non-JSON errors
    }
    if (!res.ok) {
      const message =
        (json && (json.message || json.error || json.detail)) ||
        `HTTP ${res.status}`;
      if (res.status === 401) throw new AuthError(message, 401);
      throw new Error(message);
    }
    return json ?? {};
  }

  // Single place to make requests.
  // - Adds auth headers
  // - Includes credentials (for cookie auth if you use it)
  // - Auto-refreshes once on 401 if authService.refreshToken exists
  async request(path, options = {}, { expect = "generic" } = {}) {
    const doFetch = async () =>
      fetch(joinURL(this.baseURL, path), {
        credentials: "include",
        headers: { ...this.getAuthHeaders(), ...(options.headers || {}) },
        ...(({ method, body, signal }) => ({ method, body, signal }))(options),
      });

    let res = await doFetch();
    try {
      return await this.parseResponse(res);
    } catch (err) {
      if (err instanceof AuthError) {
        // Try refresh once if available
        if (authService?.refreshToken) {
          try {
            await authService.refreshToken();
            res = await doFetch();
            return await this.parseResponse(res);
          } catch {}
        }
        // ONE-TIME local logout (no network call) + broadcast
        if (!AUTH_INVALIDATED) {
          AUTH_INVALIDATED = true;
          try {
            authService?.clear?.();
          } catch {}
          localStorage.removeItem("authToken");
          emitUnauthorized();
        }
        throw err;
      }
      throw err;
    }
  }

  /* ---------- Projects CRUD ---------- */

  async createProject(projectData) {
    const json = await this.request("projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    });
    return extractData(json, {});
  }

  async getProjects(options = {}) {
    const qs = new URLSearchParams();
    if (options.page) qs.append("page", options.page);
    if (options.limit) qs.append("limit", options.limit);
    if (options.sort) qs.append("sort", options.sort);
    if (options.order) qs.append("order", options.order);
    if (options.filter) qs.append("filter", JSON.stringify(options.filter));

    try {
      const json = await this.request(`projects?${qs.toString()}`, {
        method: "GET",
      });
      return extractData(json, []);
    } catch (e) {
      if (e instanceof AuthError) return []; // graceful empty for UI
      throw e;
    }
  }

  async getRecentProjects(limit = 5) {
    try {
      const json = await this.request(`projects/recent?limit=${limit}`, {
        method: "GET",
      });
      return extractData(json, []);
    } catch (e) {
      if (e instanceof AuthError) return []; // graceful empty for UI
      throw e;
    }
  }

  async getFavoriteProjects() {
    try {
      const json = await this.request("projects/favorites", { method: "GET" });
      return extractData(json, []);
    } catch (e) {
      if (e instanceof AuthError) return [];
      throw e;
    }
  }

  async getProject(projectId) {
    const json = await this.request(`projects/${projectId}`, { method: "GET" });
    // Single object expected
    const data = extractData(json, {});
    return Array.isArray(data) ? data[0] ?? {} : data;
  }

  async updateProject(projectId, updateData) {
    const json = await this.request(`projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
    return extractData(json, {});
  }

  async deleteProject(projectId) {
    // many APIs return 204; parseResponse tolerates empty bodies
    await this.request(`projects/${projectId}`, { method: "DELETE" });
    return true;
  }

  async toggleFavorite(projectId) {
    const json = await this.request(`projects/${projectId}/favorite`, {
      method: "PATCH",
    });
    return extractData(json, {});
  }

  async updateProjectStatus(projectId, status) {
    const json = await this.request(`projects/${projectId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return extractData(json, {});
  }

  async duplicateProject(projectId) {
    const json = await this.request(`projects/${projectId}/duplicate`, {
      method: "POST",
    });
    return extractData(json, {});
  }

  async searchProjects(searchTerm, options = {}) {
    const qs = new URLSearchParams({ q: searchTerm });
    if (options.sort) qs.append("sort", options.sort);
    if (options.order) qs.append("order", options.order);

    try {
      const json = await this.request(`projects/search?${qs.toString()}`, {
        method: "GET",
      });
      return extractData(json, []);
    } catch (e) {
      if (e instanceof AuthError) return [];
      throw e;
    }
  }

  /* ---------- Save/Load with localStorage fallback ---------- */

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
      const arr = await this.getRecentProjects();
      return Array.isArray(arr) ? arr : [];
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
