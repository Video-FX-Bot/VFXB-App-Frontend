const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * User Model
 * Represents a user in the VFXB application
 */
class User {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.email = data.email;
    this.username = data.username;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.passwordHash = data.passwordHash;
    this.avatar = data.avatar;
    this.roles = data.roles || ['user'];
    this.preferences = data.preferences || this.getDefaultPreferences();
    this.subscription = data.subscription || this.getDefaultSubscription();
    this.profile = data.profile || this.getDefaultProfile();
    this.security = data.security || this.getDefaultSecurity();
    this.aiSettings = data.aiSettings || this.getDefaultAISettings();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.lastLoginAt = data.lastLoginAt;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isVerified = data.isVerified !== undefined ? data.isVerified : false;
    this.verificationToken = data.verificationToken;
    this.resetPasswordToken = data.resetPasswordToken;
    this.resetPasswordExpires = data.resetPasswordExpires;
  }

  /**
   * Get default user preferences
   */
  getDefaultPreferences() {
    return {
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: true,
        projectUpdates: true,
        aiSuggestions: true,
        collaborationInvites: true
      },
      editor: {
        autoSave: true,
        autoSaveInterval: 30, // seconds
        showGrid: true,
        snapToGrid: true,
        defaultVideoQuality: 'high',
        previewQuality: 'medium'
      },
      privacy: {
        profileVisibility: 'public',
        projectVisibility: 'private',
        allowAnalytics: true
      }
    };
  }

  /**
   * Get default subscription settings
   */
  getDefaultSubscription() {
    return {
      plan: 'free',
      status: 'active',
      startDate: new Date(),
      endDate: null,
      features: {
        maxProjects: 3,
        maxStorageGB: 1,
        aiCreditsPerMonth: 100,
        collaborators: 1,
        exportQuality: 'standard',
        prioritySupport: false,
        advancedFeatures: false
      },
      usage: {
        projectsUsed: 0,
        storageUsedGB: 0,
        aiCreditsUsed: 0,
        collaboratorsUsed: 0
      }
    };
  }

  /**
   * Get default user profile
   */
  getDefaultProfile() {
    return {
      bio: '',
      website: '',
      location: '',
      company: '',
      skills: [],
      socialLinks: {
        twitter: '',
        linkedin: '',
        youtube: '',
        instagram: ''
      },
      portfolio: {
        showcaseProjects: [],
        achievements: [],
        certifications: []
      }
    };
  }

  /**
   * Get default security settings
   */
  getDefaultSecurity() {
    return {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: [],
      loginAttempts: 0,
      lockoutUntil: null,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      trustedDevices: [],
      securityQuestions: []
    };
  }

  /**
   * Get default AI settings
   */
  getDefaultAISettings() {
    return {
      autoSuggestions: true,
      suggestionFrequency: 'medium', // low, medium, high
      preferredModels: {
        chat: 'gpt-4',
        vision: 'gpt-4-vision-preview',
        voice: 'whisper-1'
      },
      customPrompts: [],
      learningPreferences: {
        saveInteractions: true,
        personalizeRecommendations: true,
        shareAnonymousData: false
      },
      voiceSettings: {
        language: 'en-US',
        speed: 1.0,
        pitch: 1.0
      }
    };
  }

  /**
   * Hash password
   */
  async setPassword(password) {
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(password, saltRounds);
    this.updatedAt = new Date();
  }

  /**
   * Verify password
   */
  async verifyPassword(password) {
    if (!this.passwordHash) {
      return false;
    }
    return await bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Update user data
   */
  update(data) {
    const allowedFields = [
      'email', 'username', 'firstName', 'lastName', 'avatar',
      'preferences', 'profile', 'aiSettings'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        if (field === 'preferences' || field === 'profile' || field === 'aiSettings') {
          this[field] = { ...this[field], ...data[field] };
        } else {
          this[field] = data[field];
        }
      }
    });

    this.updatedAt = new Date();
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin() {
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    return this.roles.includes(role);
  }

  /**
   * Add role to user
   */
  addRole(role) {
    if (!this.hasRole(role)) {
      this.roles.push(role);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove role from user
   */
  removeRole(role) {
    const index = this.roles.indexOf(role);
    if (index > -1) {
      this.roles.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * Check if user can perform action based on subscription
   */
  canPerformAction(action, currentUsage = {}) {
    const { features } = this.subscription;
    
    switch (action) {
      case 'createProject':
        return currentUsage.projectsUsed < features.maxProjects;
      case 'useAI':
        return currentUsage.aiCreditsUsed < features.aiCreditsPerMonth;
      case 'addCollaborator':
        return currentUsage.collaboratorsUsed < features.collaborators;
      case 'uploadFile':
        return currentUsage.storageUsedGB < features.maxStorageGB;
      case 'exportHD':
        return features.exportQuality === 'high' || features.exportQuality === 'ultra';
      case 'prioritySupport':
        return features.prioritySupport;
      case 'advancedFeatures':
        return features.advancedFeatures;
      default:
        return true;
    }
  }

  /**
   * Update subscription usage
   */
  updateUsage(type, amount) {
    if (!this.subscription.usage[type]) {
      this.subscription.usage[type] = 0;
    }
    
    this.subscription.usage[type] += amount;
    this.updatedAt = new Date();
  }

  /**
   * Reset monthly usage (for subscription renewals)
   */
  resetMonthlyUsage() {
    this.subscription.usage = {
      projectsUsed: this.subscription.usage.projectsUsed, // Don't reset project count
      storageUsedGB: this.subscription.usage.storageUsedGB, // Don't reset storage
      aiCreditsUsed: 0, // Reset AI credits
      collaboratorsUsed: this.subscription.usage.collaboratorsUsed // Don't reset collaborators
    };
    this.updatedAt = new Date();
  }

  /**
   * Generate verification token
   */
  generateVerificationToken() {
    this.verificationToken = uuidv4();
    this.updatedAt = new Date();
    return this.verificationToken;
  }

  /**
   * Verify user account
   */
  verify() {
    this.isVerified = true;
    this.verificationToken = null;
    this.updatedAt = new Date();
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken() {
    this.resetPasswordToken = uuidv4();
    this.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    this.updatedAt = new Date();
    return this.resetPasswordToken;
  }

  /**
   * Clear password reset token
   */
  clearPasswordResetToken() {
    this.resetPasswordToken = null;
    this.resetPasswordExpires = null;
    this.updatedAt = new Date();
  }

  /**
   * Convert to JSON (exclude sensitive data)
   */
  toJSON() {
    const {
      passwordHash,
      verificationToken,
      resetPasswordToken,
      resetPasswordExpires,
      security,
      ...publicData
    } = this;

    return {
      ...publicData,
      security: {
        twoFactorEnabled: security.twoFactorEnabled,
        sessionTimeout: security.sessionTimeout
      }
    };
  }

  /**
   * Convert to safe JSON for public display
   */
  toPublicJSON() {
    return {
      id: this.id,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      avatar: this.avatar,
      profile: {
        bio: this.profile.bio,
        website: this.profile.website,
        location: this.profile.location,
        company: this.profile.company,
        skills: this.profile.skills,
        socialLinks: this.profile.socialLinks
      },
      createdAt: this.createdAt
    };
  }

  /**
   * Validate user data
   */
  static validate(data) {
    const errors = [];

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Valid email is required');
    }

    if (!data.username || data.username.length < 3 || data.username.length > 30) {
      errors.push('Username must be between 3 and 30 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    if (!data.firstName || data.firstName.length < 1 || data.firstName.length > 50) {
      errors.push('First name must be between 1 and 50 characters');
    }

    if (!data.lastName || data.lastName.length < 1 || data.lastName.length > 50) {
      errors.push('Last name must be between 1 and 50 characters');
    }

    return errors;
  }
}

module.exports = User;