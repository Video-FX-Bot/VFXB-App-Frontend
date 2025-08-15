import validator from 'validator';
import { logger } from './logger.js';

// Common validation patterns
const patterns = {
  username: /^[a-zA-Z0-9_-]{3,30}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  videoTitle: /^[\w\s\-_.,!?()]{1,100}$/,
  tagName: /^[\w\s-]{1,30}$/,
  fileName: /^[\w\s\-_.()]{1,255}$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  timeFormat: /^\d{1,2}:\d{2}(:\d{2})?$/,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
};

// Validation rules
const validationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: patterns.username,
    sanitize: true,
    customValidation: (value) => {
      // Check for reserved usernames
      const reserved = ['admin', 'root', 'api', 'www', 'mail', 'support', 'help', 'info', 'contact'];
      if (reserved.includes(value.toLowerCase())) {
        return 'Username is reserved';
      }
      return null;
    }
  },
  
  email: {
    required: true,
    maxLength: 254,
    sanitize: true,
    customValidation: (value) => {
      if (!validator.isEmail(value)) {
        return 'Invalid email format';
      }
      
      // Check for disposable email domains
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'throwaway.email', 'temp-mail.org'
      ];
      
      const domain = value.split('@')[1]?.toLowerCase();
      if (disposableDomains.includes(domain)) {
        return 'Disposable email addresses are not allowed';
      }
      
      return null;
    }
  },
  
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: patterns.password,
    customValidation: (value) => {
      // Check for common weak passwords
      const weakPasswords = [
        'password', '123456', 'password123', 'admin', 'qwerty',
        'letmein', 'welcome', 'monkey', '1234567890'
      ];
      
      if (weakPasswords.includes(value.toLowerCase())) {
        return 'Password is too common and weak';
      }
      
      // Check for repeated characters
      if (/(..).*\1/.test(value)) {
        const repeatedCount = value.match(/(..).*\1/g)?.length || 0;
        if (repeatedCount > 2) {
          return 'Password contains too many repeated patterns';
        }
      }
      
      return null;
    }
  },
  
  videoTitle: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: patterns.videoTitle,
    sanitize: true
  },
  
  videoDescription: {
    required: false,
    maxLength: 1000,
    sanitize: true,
    customValidation: (value) => {
      if (value && value.trim().length === 0) {
        return null; // Allow empty descriptions
      }
      return null;
    }
  },
  
  tags: {
    required: false,
    customValidation: (value) => {
      if (!value) return null;
      
      const tags = Array.isArray(value) ? value : value.split(',').map(t => t.trim());
      
      if (tags.length > 20) {
        return 'Maximum 20 tags allowed';
      }
      
      for (const tag of tags) {
        if (tag.length > 30) {
          return 'Tag length cannot exceed 30 characters';
        }
        if (!patterns.tagName.test(tag)) {
          return 'Tags can only contain letters, numbers, spaces, and hyphens';
        }
      }
      
      return null;
    }
  },
  
  chatMessage: {
    required: true,
    minLength: 1,
    maxLength: 2000,
    sanitize: true,
    customValidation: (value) => {
      // Check for spam patterns
      const spamPatterns = [
        /http[s]?:\/\//gi, // URLs
        /\b(buy|sell|cheap|free|money|cash|prize|winner)\b/gi, // Spam keywords
        /[A-Z]{10,}/g, // Excessive caps
        /[!]{3,}/g, // Excessive exclamation marks
      ];
      
      let spamScore = 0;
      spamPatterns.forEach(pattern => {
        if (pattern.test(value)) spamScore++;
      });
      
      if (spamScore >= 2) {
        return 'Message appears to be spam';
      }
      
      return null;
    }
  },
  
  fileName: {
    required: true,
    minLength: 1,
    maxLength: 255,
    pattern: patterns.fileName,
    customValidation: (value) => {
      // Check for dangerous file names
      const dangerous = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'lpt1', 'lpt2'];
      const nameWithoutExt = value.split('.')[0].toLowerCase();
      
      if (dangerous.includes(nameWithoutExt)) {
        return 'Invalid file name';
      }
      
      return null;
    }
  },
  
  url: {
    required: false,
    customValidation: (value) => {
      if (!value) return null;
      
      if (!validator.isURL(value, {
        protocols: ['http', 'https'],
        require_protocol: true,
        require_valid_protocol: true
      })) {
        return 'Invalid URL format';
      }
      
      return null;
    }
  },
  
  phoneNumber: {
    required: false,
    customValidation: (value) => {
      if (!value) return null;
      
      if (!validator.isMobilePhone(value, 'any', { strictMode: false })) {
        return 'Invalid phone number format';
      }
      
      return null;
    }
  },
  
  timezone: {
    required: false,
    customValidation: (value) => {
      if (!value) return null;
      
      try {
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return null;
      } catch {
        return 'Invalid timezone';
      }
    }
  },
  
  language: {
    required: false,
    customValidation: (value) => {
      if (!value) return null;
      
      const supportedLanguages = [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
        'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
      ];
      
      if (!supportedLanguages.includes(value)) {
        return 'Unsupported language';
      }
      
      return null;
    }
  }
};

// Main validation function
export const validateInput = (value, type, options = {}) => {
  try {
    const rule = validationRules[type];
    
    if (!rule) {
      return {
        isValid: false,
        message: `Unknown validation type: ${type}`,
        sanitizedValue: value
      };
    }
    
    let sanitizedValue = value;
    
    // Handle null/undefined values
    if (value === null || value === undefined) {
      if (rule.required) {
        return {
          isValid: false,
          message: `${type} is required`,
          sanitizedValue: null
        };
      }
      return {
        isValid: true,
        message: null,
        sanitizedValue: null
      };
    }
    
    // Convert to string for validation
    const stringValue = String(value);
    
    // Sanitize input
    if (rule.sanitize) {
      sanitizedValue = sanitizeInput(stringValue, type);
    }
    
    // Required validation
    if (rule.required && (!sanitizedValue || sanitizedValue.trim().length === 0)) {
      return {
        isValid: false,
        message: `${type} is required`,
        sanitizedValue
      };
    }
    
    // Skip further validation if value is empty and not required
    if (!rule.required && (!sanitizedValue || sanitizedValue.trim().length === 0)) {
      return {
        isValid: true,
        message: null,
        sanitizedValue: sanitizedValue || null
      };
    }
    
    // Length validation
    if (rule.minLength && sanitizedValue.length < rule.minLength) {
      return {
        isValid: false,
        message: `${type} must be at least ${rule.minLength} characters long`,
        sanitizedValue
      };
    }
    
    if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
      return {
        isValid: false,
        message: `${type} cannot exceed ${rule.maxLength} characters`,
        sanitizedValue
      };
    }
    
    // Pattern validation
    if (rule.pattern && !rule.pattern.test(sanitizedValue)) {
      return {
        isValid: false,
        message: getPatternErrorMessage(type),
        sanitizedValue
      };
    }
    
    // Custom validation
    if (rule.customValidation) {
      const customError = rule.customValidation(sanitizedValue, options);
      if (customError) {
        return {
          isValid: false,
          message: customError,
          sanitizedValue
        };
      }
    }
    
    return {
      isValid: true,
      message: null,
      sanitizedValue
    };
    
  } catch (error) {
    logger.error('Validation error:', { type, value, error: error.message });
    return {
      isValid: false,
      message: 'Validation failed',
      sanitizedValue: value
    };
  }
};

// Batch validation function
export const validateInputs = (inputs) => {
  const results = {};
  let isValid = true;
  
  for (const [field, { value, type, options }] of Object.entries(inputs)) {
    const result = validateInput(value, type, options);
    results[field] = result;
    
    if (!result.isValid) {
      isValid = false;
    }
  }
  
  return {
    isValid,
    results,
    sanitizedValues: Object.fromEntries(
      Object.entries(results).map(([field, result]) => [field, result.sanitizedValue])
    ),
    errors: Object.fromEntries(
      Object.entries(results)
        .filter(([, result]) => !result.isValid)
        .map(([field, result]) => [field, result.message])
    )
  };
};

// Input sanitization function
const sanitizeInput = (value, type) => {
  if (!value) return value;
  
  let sanitized = value;
  
  // Basic HTML escaping
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Type-specific sanitization
  switch (type) {
    case 'email':
      sanitized = sanitized.toLowerCase().trim();
      break;
      
    case 'username':
      sanitized = sanitized.toLowerCase().trim();
      break;
      
    case 'videoTitle':
    case 'videoDescription':
      sanitized = sanitized.trim();
      // Remove excessive whitespace
      sanitized = sanitized.replace(/\s+/g, ' ');
      break;
      
    case 'chatMessage':
      sanitized = sanitized.trim();
      // Remove excessive whitespace but preserve line breaks
      sanitized = sanitized.replace(/[ \t]+/g, ' ');
      sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
      break;
      
    case 'fileName':
      sanitized = sanitized.trim();
      // Remove dangerous characters
      sanitized = sanitized.replace(/[<>:"|?*\\]/g, '');
      break;
      
    default:
      sanitized = sanitized.trim();
  }
  
  return sanitized;
};

// Get pattern-specific error messages
const getPatternErrorMessage = (type) => {
  const messages = {
    username: 'Username can only contain letters, numbers, underscores, and hyphens',
    password: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character',
    videoTitle: 'Video title contains invalid characters',
    tagName: 'Tag contains invalid characters',
    fileName: 'File name contains invalid characters',
    hexColor: 'Invalid color format (use #RRGGBB or #RGB)',
    timeFormat: 'Invalid time format (use HH:MM or HH:MM:SS)',
    ipAddress: 'Invalid IP address format'
  };
  
  return messages[type] || `Invalid ${type} format`;
};

// File validation
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024 * 1024, // 5GB default
    allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    allowedExtensions = ['.mp4', '.mpeg', '.mov', '.avi', '.webm'],
    requireExtension = true
  } = options;
  
  if (!file) {
    return {
      isValid: false,
      message: 'No file provided'
    };
  }
  
  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      message: `File size exceeds limit of ${Math.round(maxSize / (1024 * 1024))}MB`
    };
  }
  
  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      message: 'File type not allowed'
    };
  }
  
  // Check file extension
  if (requireExtension) {
    const extension = '.' + file.originalname.split('.').pop().toLowerCase();
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        message: 'File extension not allowed'
      };
    }
  }
  
  // Validate file name
  const nameValidation = validateInput(file.originalname, 'fileName');
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  return {
    isValid: true,
    message: null
  };
};

// Security validation helpers
export const validateApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // API key should be at least 32 characters and contain only alphanumeric characters
  return /^[a-zA-Z0-9]{32,}$/.test(apiKey);
};

export const validateJWT = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic JWT format validation (3 parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
};

export const validateIPAddress = (ip) => {
  return validator.isIP(ip);
};

export const validateUserAgent = (userAgent) => {
  if (!userAgent || typeof userAgent !== 'string') {
    return false;
  }
  
  // Basic user agent validation (should contain browser/version info)
  return userAgent.length > 10 && userAgent.length < 500;
};

// Rate limiting validation
export const validateRateLimit = (requests, windowMs, maxRequests) => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Filter requests within the time window
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  return {
    isAllowed: recentRequests.length < maxRequests,
    requestCount: recentRequests.length,
    resetTime: windowStart + windowMs
  };
};

// Content validation for AI safety
export const validateAIContent = (content) => {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      message: 'Content is required'
    };
  }
  
  // Check for potentially harmful content
  const harmfulPatterns = [
    /\b(hack|crack|exploit|vulnerability)\b/gi,
    /\b(bomb|weapon|violence|kill)\b/gi,
    /\b(illegal|piracy|copyright)\b/gi,
    /\b(adult|nsfw|explicit)\b/gi
  ];
  
  for (const pattern of harmfulPatterns) {
    if (pattern.test(content)) {
      return {
        isValid: false,
        message: 'Content contains potentially harmful or inappropriate material'
      };
    }
  }
  
  return {
    isValid: true,
    message: null
  };
};

// Export validation rules for external use
export { validationRules, patterns };