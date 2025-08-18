class AuthService {
  constructor() {
    this.tokenKey = 'authToken';
    this.userKey = 'currentUser';
  }

  // Get authentication token from localStorage
  getToken() {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Set authentication token in localStorage
  setToken(token) {
    try {
      if (token) {
        localStorage.setItem(this.tokenKey, token);
      } else {
        localStorage.removeItem(this.tokenKey);
      }
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
  }

  // Remove authentication token
  removeToken() {
    try {
      localStorage.removeItem(this.tokenKey);
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }

  // Get current user from localStorage
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem(this.userKey);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Set current user in localStorage
  setCurrentUser(user) {
    try {
      if (user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.userKey);
      }
    } catch (error) {
      console.error('Error setting current user:', error);
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Get user ID
  getUserId() {
    const user = this.getCurrentUser();
    return user ? user.id || user._id : null;
  }

  // Login method (basic implementation)
  async login(credentials) {
    try {
      // For now, create a demo user since we don't have full auth implementation
      const demoUser = {
        id: 'demo-user-' + Date.now(),
        username: credentials.username || 'demo-user',
        email: credentials.email || 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User'
      };
      
      const demoToken = 'demo-token-' + Date.now();
      
      this.setToken(demoToken);
      this.setCurrentUser(demoUser);
      
      return {
        success: true,
        user: demoUser,
        token: demoToken
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout method
  logout() {
    try {
      this.removeToken();
      this.setCurrentUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Initialize demo user if no auth exists
  initializeDemoUser() {
    if (!this.isAuthenticated()) {
      const demoUser = {
        id: 'demo-user-default',
        username: 'demo-user',
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User'
      };
      
      const demoToken = 'demo-token-default';
      
      this.setToken(demoToken);
      this.setCurrentUser(demoUser);
      
      console.log('Demo user initialized for development');
    }
  }
}

// Create singleton instance
const authService = new AuthService();

// Initialize demo user for development
if (import.meta.env.DEV) {
  authService.initializeDemoUser();
}

export { authService };
export default authService;