import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { localStorageService } from '../services/localStorageService.js';

class User {
  constructor(userData) {
    this._id = userData._id;
    this.username = userData.username;
    this.email = userData.email;
    this.password = userData.password;
    this.firstName = userData.firstName;
    this.lastName = userData.lastName;
    this.avatar = userData.avatar;
    this.isActive = userData.isActive !== undefined ? userData.isActive : true;
    this.isEmailVerified = userData.isEmailVerified !== undefined ? userData.isEmailVerified : false;
    this.role = userData.role || 'user';
    this.subscription = userData.subscription || {
      plan: 'free',
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: null,
      features: {
        maxProjects: 3,
        maxStorageGB: 1,
        aiCredits: 100,
        exportQuality: 'HD',
        collaborators: 0
      }
    };
    this.preferences = userData.preferences || {
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        marketing: false
      },
      privacy: {
        profileVisibility: 'private',
        showOnlineStatus: false
      }
    };
    this.stats = userData.stats || {
      totalProjects: 0,
      totalVideosProcessed: 0,
      totalStorageUsed: 0,
      aiCreditsUsed: 0,
      lastLoginAt: null,
      accountCreatedAt: new Date().toISOString()
    };
    this.createdAt = userData.createdAt || new Date().toISOString();
    this.updatedAt = userData.updatedAt || new Date().toISOString();
  }

  // Static methods for database operations
  static async create(userData) {
    try {
      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        throw new Error('Username, email, and password are required');
      }

      // Check if user already exists
      const existingUser = await localStorageService.findUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user data
      const newUserData = {
        ...userData,
        password: hashedPassword
      };

      // Save to local storage
      const savedUser = await localStorageService.createUser(newUserData);
      return new User(savedUser);
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const userData = await localStorageService.findUserByEmail(email);
      return userData ? new User(userData) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const userData = await localStorageService.findUserById(id);
      return userData ? new User(userData) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmailWithPassword(email) {
    try {
      const userData = await localStorageService.findUserByEmail(email);
      return userData ? new User(userData) : null;
    } catch (error) {
      throw error;
    }
  }

  // Instance methods
  async save() {
    try {
      this.updatedAt = new Date().toISOString();
      const updatedUser = await localStorageService.updateUser(this._id, this.toObject());
      return new User(updatedUser);
    } catch (error) {
      throw error;
    }
  }

  async comparePassword(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(newPassword) {
    try {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      this.password = await bcrypt.hash(newPassword, saltRounds);
      return await this.save();
    } catch (error) {
      throw error;
    }
  }

  generatePasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    return resetToken;
  }

  generateEmailVerificationToken() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    return verificationToken;
  }

  updateLastLogin() {
    this.stats.lastLoginAt = new Date().toISOString();
    return this.save();
  }

  incrementProjectCount() {
    this.stats.totalProjects += 1;
    return this.save();
  }

  incrementVideoCount() {
    this.stats.totalVideosProcessed += 1;
    return this.save();
  }

  updateStorageUsed(bytes) {
    this.stats.totalStorageUsed = bytes;
    return this.save();
  }

  useAICredits(amount) {
    this.stats.aiCreditsUsed += amount;
    return this.save();
  }

  canUseAICredits(amount) {
    const availableCredits = this.subscription.features.aiCredits - this.stats.aiCreditsUsed;
    return availableCredits >= amount;
  }

  canCreateProject() {
    return this.stats.totalProjects < this.subscription.features.maxProjects;
  }

  canUploadFile(fileSizeBytes) {
    const maxStorageBytes = this.subscription.features.maxStorageGB * 1024 * 1024 * 1024;
    return (this.stats.totalStorageUsed + fileSizeBytes) <= maxStorageBytes;
  }

  toObject() {
    return {
      _id: this._id,
      username: this.username,
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      avatar: this.avatar,
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      role: this.role,
      subscription: this.subscription,
      preferences: this.preferences,
      stats: this.stats,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toJSON() {
    const obj = this.toObject();
    delete obj.password; // Never include password in JSON output
    return obj;
  }

  getPublicProfile() {
    return {
      _id: this._id,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      avatar: this.avatar,
      stats: {
        totalProjects: this.stats.totalProjects,
        accountCreatedAt: this.stats.accountCreatedAt
      }
    };
  }
}

export default User;
export { User };