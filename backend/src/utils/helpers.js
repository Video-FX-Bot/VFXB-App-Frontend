const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/helpers.log' })
  ]
});

/**
 * Encryption and Decryption Utilities
 */
class CryptoUtils {
  static algorithm = 'aes-256-gcm';
  static keyLength = 32;
  static ivLength = 16;
  static tagLength = 16;

  /**
   * Generate a random encryption key
   */
  static generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Encrypt data
   */
  static encrypt(text, key) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  static decrypt(encryptedData, key) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      const decipher = crypto.createDecipher(this.algorithm, key, Buffer.from(iv, 'hex'));
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash data with salt
   */
  static hash(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
    
    return {
      hash,
      salt: actualSalt
    };
  }

  /**
   * Verify hash
   */
  static verifyHash(data, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
}

/**
 * File Utilities
 */
class FileUtils {
  /**
   * Get file extension
   */
  static getExtension(filename) {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Get file name without extension
   */
  static getNameWithoutExtension(filename) {
    return path.basename(filename, path.extname(filename));
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(originalName) {
    const ext = this.getExtension(originalName);
    const name = this.getNameWithoutExtension(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    
    return `${name}_${timestamp}_${random}${ext}`;
  }

  /**
   * Validate file type
   */
  static isValidFileType(filename, allowedTypes) {
    const ext = this.getExtension(filename);
    return allowedTypes.includes(ext);
  }

  /**
   * Get MIME type from extension
   */
  static getMimeType(filename) {
    const ext = this.getExtension(filename);
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Ensure directory exists
   */
  static async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Clean up old files
   */
  static async cleanupOldFiles(directory, maxAge = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(directory);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          logger.info('Cleaned up old file:', filePath);
        }
      }
    } catch (error) {
      logger.error('File cleanup failed:', error);
    }
  }
}

/**
 * Validation Utilities
 */
class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  /**
   * Calculate password strength
   */
  static calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 20);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    // Penalty for common patterns
    if (/123|abc|qwe/i.test(password)) score -= 10;
    if (/password|admin|user/i.test(password)) score -= 20;
    
    if (score < 30) return 'weak';
    if (score < 60) return 'medium';
    if (score < 80) return 'strong';
    return 'very_strong';
  }

  /**
   * Validate username
   */
  static validateUsername(username) {
    const errors = [];
    
    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    
    if (username.length > 30) {
      errors.push('Username must be less than 30 characters');
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
    
    if (/^[0-9]/.test(username)) {
      errors.push('Username cannot start with a number');
    }
    
    const reservedNames = ['admin', 'root', 'user', 'api', 'www', 'mail', 'support'];
    if (reservedNames.includes(username.toLowerCase())) {
      errors.push('Username is reserved');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize input string
   */
  static sanitizeString(input, maxLength = 1000) {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }

  /**
   * Validate URL
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Date and Time Utilities
 */
class DateUtils {
  /**
   * Format date for display
   */
  static formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  static getRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  /**
   * Add time to date
   */
  static addTime(date, amount, unit) {
    const d = new Date(date);
    
    switch (unit) {
      case 'seconds':
        d.setSeconds(d.getSeconds() + amount);
        break;
      case 'minutes':
        d.setMinutes(d.getMinutes() + amount);
        break;
      case 'hours':
        d.setHours(d.getHours() + amount);
        break;
      case 'days':
        d.setDate(d.getDate() + amount);
        break;
      case 'weeks':
        d.setDate(d.getDate() + (amount * 7));
        break;
      case 'months':
        d.setMonth(d.getMonth() + amount);
        break;
      case 'years':
        d.setFullYear(d.getFullYear() + amount);
        break;
    }
    
    return d;
  }
}

/**
 * Response Utilities
 */
class ResponseUtils {
  /**
   * Standard success response
   */
  static success(data = null, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      statusCode
    };
  }

  /**
   * Standard error response
   */
  static error(message = 'An error occurred', statusCode = 500, details = null) {
    return {
      success: false,
      message,
      error: details,
      timestamp: new Date().toISOString(),
      statusCode
    };
  }

  /**
   * Paginated response
   */
  static paginated(data, page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Async Utilities
 */
class AsyncUtils {
  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry(fn, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Timeout wrapper for promises
   */
  static timeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), ms)
      )
    ]);
  }
}

module.exports = {
  CryptoUtils,
  FileUtils,
  ValidationUtils,
  DateUtils,
  ResponseUtils,
  AsyncUtils
};