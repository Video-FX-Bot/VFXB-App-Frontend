// src/services/authService.js

class AuthService {
  constructor() {
    this.tokenKey = "authToken";
    this.userKey = "currentUser";
    this.baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }

  // ---------- storage ----------
  getToken() {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  setToken(token) {
    try {
      if (token) localStorage.setItem(this.tokenKey, token);
      else localStorage.removeItem(this.tokenKey);
    } catch {}
  }

  removeToken() {
    this.setToken(null);
  }

  getCurrentUser() {
    try {
      const s = localStorage.getItem(this.userKey);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  setCurrentUser(user) {
    try {
      if (user) localStorage.setItem(this.userKey, JSON.stringify(user));
      else localStorage.removeItem(this.userKey);
    } catch {}
  }

  isAuthenticated() {
    return !!(this.getToken() && this.getCurrentUser());
  }

  getUserId() {
    const u = this.getCurrentUser();
    return u ? u.id || u._id : null;
  }

  // ---------- helpers ----------
  async _json(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  _headers() {
    return { "Content-Type": "application/json" };
  }

  // ---------- auth ----------
  /**
   * credentials: { identifier | email | username, password, rememberMe? }
   */
  async login(credentials) {
    const identifier =
      credentials.identifier || credentials.email || credentials.username;

    const body = {
      identifier,
      password: credentials.password,
      rememberMe: !!credentials.rememberMe,
    };

    const res = await fetch(`${this.baseURL}/auth/login`, {
      method: "POST",
      headers: this._headers(),
      credentials: "include", // for httpOnly cookies
      body: JSON.stringify(body),
    });

    const json = await this._json(res);
    if (!res.ok || json.success === false) {
      throw new Error(json.message || "Login failed");
    }

    // Support both:
    // A) { token, user }
    // B) { data: { user, tokens: { accessToken, refreshToken } } }
    const user = json.user ?? json.data?.user ?? null;
    const token = json.token ?? json.data?.tokens?.accessToken ?? null;

    if (!user) throw new Error("No user in response");

    // If you rely solely on httpOnly cookies, token may be null — that's OK.
    if (token) this.setToken(token);
    else this.removeToken();

    this.setCurrentUser(user);

    return { success: true, user, token };
  }

  async signup(payload) {
    // Expecting backend /auth/register returns similar shape or { success, data: { user, tokens } }
    const res = await fetch(`${this.baseURL}/auth/register`, {
      method: "POST",
      headers: this._headers(),
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const json = await this._json(res);
    if (!res.ok || json.success === false) {
      throw new Error(json.message || "Registration failed");
    }

    const user = json.user ?? json.data?.user ?? null;
    const token = json.token ?? json.data?.tokens?.accessToken ?? null;

    if (user) this.setCurrentUser(user);
    if (token) this.setToken(token);
    else this.removeToken();

    return { success: true, user, token };
  }

  async me() {
    const res = await fetch(`${this.baseURL}/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: {
        ...this._headers(),
        ...(this.getToken() && { Authorization: `Bearer ${this.getToken()}` }),
      },
    });

    const json = await this._json(res);
    if (!res.ok || json.success === false) {
      throw new Error(json.message || "Failed to fetch current user");
    }

    const user = json.data?.user || json.user || null;
    if (user) this.setCurrentUser(user);
    return user;
  }

  async refresh() {
    // Works whether tokens are stored in cookies or body
    const res = await fetch(`${this.baseURL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: this._headers(),
      body: JSON.stringify({ refreshToken: this.getToken() || undefined }),
    });

    const json = await this._json(res);
    if (!res.ok || json.success === false) {
      throw new Error(json.message || "Refresh failed");
    }

    const newToken = json.token ?? json.data?.tokens?.accessToken ?? null;

    if (newToken) this.setToken(newToken);
    return newToken;
  }

  async logout() {
    try {
      await fetch(`${this.baseURL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    } finally {
      this.removeToken();
      this.setCurrentUser(null);
    }
    return { success: true };
  }

  // ---------- demo mode (optional) ----------
  initializeDemoUser() {
    if (
      import.meta.env.DEV &&
      import.meta.env.VITE_DEMO_AUTH === "true" &&
      !this.isAuthenticated()
    ) {
      const demoUser = {
        id: "demo-user-default",
        username: "demo-user",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
      };
      const demoToken = "demo-token-default";
      this.setToken(demoToken);
      this.setCurrentUser(demoUser);
      console.log("Demo user initialized");
    }
  }
}

const authService = new AuthService();

// Only enable demo auth when explicitly set
authService.initializeDemoUser();

export { authService };
export default authService;
