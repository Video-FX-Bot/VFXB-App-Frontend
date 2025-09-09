// Application constants

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // User Management
  USER: {
    PROFILE: '/user/profile',
    UPDATE: '/user/update',
    DELETE: '/user/delete',
    SETTINGS: '/user/settings',
    SUBSCRIPTION: '/user/subscription',
  },
  
  // Video Operations
  VIDEO: {
    UPLOAD: '/video/upload',
    LIST: '/video/list',
    GET: '/video/:id',
    DELETE: '/video/:id',
    PROCESS: '/video/:id/process',
    EXPORT: '/video/:id/export',
    THUMBNAIL: '/video/:id/thumbnail',
    METADATA: '/video/:id/metadata',
  },
  
  // AI Chat
  AI: {
    CHAT: '/ai/chat',
    PROCESS: '/ai/process',
    SUGGESTIONS: '/ai/suggestions',
    HISTORY: '/ai/history',
  },
  
  // Analytics
  ANALYTICS: {
    TRACK: '/analytics/track',
    REPORT: '/analytics/report',
  },
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_AUDIO_SIZE: 100 * 1024 * 1024, // 100MB
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/webm',
    'video/avi',
    'video/mov',
    'video/mkv',
    'video/wmv',
    'video/flv',
  ],
  ALLOWED_AUDIO_TYPES: [
    'audio/mp3',
    'audio/wav',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
    'audio/m4a',
  ],
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
};

// Video Processing Options
export const VIDEO_PROCESSING = {
  QUALITY_PRESETS: {
    LOW: { width: 480, height: 360, bitrate: '500k' },
    MEDIUM: { width: 720, height: 480, bitrate: '1000k' },
    HIGH: { width: 1280, height: 720, bitrate: '2500k' },
    ULTRA: { width: 1920, height: 1080, bitrate: '5000k' },
  },
  
  EXPORT_FORMATS: [
    { value: 'mp4', label: 'MP4', extension: '.mp4' },
    { value: 'webm', label: 'WebM', extension: '.webm' },
    { value: 'avi', label: 'AVI', extension: '.avi' },
    { value: 'mov', label: 'MOV', extension: '.mov' },
  ],
  
  OPERATIONS: {
    TRIM: 'trim',
    CROP: 'crop',
    RESIZE: 'resize',
    ROTATE: 'rotate',
    FLIP: 'flip',
    AUDIO_ENHANCE: 'audio_enhance',
    NOISE_REDUCTION: 'noise_reduction',
    COLOR_CORRECTION: 'color_correction',
    ADD_SUBTITLES: 'add_subtitles',
    ADD_WATERMARK: 'add_watermark',
    SPEED_CHANGE: 'speed_change',
    FADE_IN: 'fade_in',
    FADE_OUT: 'fade_out',
  },
};

// UI Constants
export const UI_CONFIG = {
  SIDEBAR_WIDTH: 320,
  SIDEBAR_COLLAPSED_WIDTH: 60,
  HEADER_HEIGHT: 64,
  FOOTER_HEIGHT: 48,
  
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  },
  
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080,
  },
};

// Theme Configuration
export const THEME_CONFIG = {
  COLORS: {
    PRIMARY: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    SECONDARY: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
  
  FONTS: {
    SANS: ['Inter', 'system-ui', 'sans-serif'],
    MONO: ['JetBrains Mono', 'Consolas', 'monospace'],
  },
};

// Chat Configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_HISTORY_LENGTH: 100,
  TYPING_INDICATOR_DELAY: 1000,
  AUTO_SCROLL_THRESHOLD: 100,
  
  MESSAGE_TYPES: {
    USER: 'user',
    AI: 'ai',
    SYSTEM: 'system',
    ERROR: 'error',
  },
  
  SUGGESTED_ACTIONS: [
    'Enhance audio quality',
    'Add subtitles',
    'Trim video',
    'Adjust colors',
    'Remove background noise',
    'Export video',
    'Add transitions',
    'Crop video',
  ],
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  // Global shortcuts
  TOGGLE_SIDEBAR: 'ctrl+b',
  TOGGLE_THEME: 'ctrl+shift+t',
  OPEN_SEARCH: 'ctrl+k',
  SAVE: 'ctrl+s',
  UNDO: 'ctrl+z',
  REDO: 'ctrl+y',
  
  // Video player shortcuts
  PLAY_PAUSE: 'space',
  SEEK_FORWARD: 'arrowright',
  SEEK_BACKWARD: 'arrowleft',
  VOLUME_UP: 'arrowup',
  VOLUME_DOWN: 'arrowdown',
  MUTE: 'm',
  FULLSCREEN: 'f',
  
  // Editor shortcuts
  SPLIT_CLIP: 's',
  DELETE_CLIP: 'delete',
  COPY: 'ctrl+c',
  PASTE: 'ctrl+v',
  SELECT_ALL: 'ctrl+a',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  INVALID_FILE_TYPE: 'Invalid file type. Please select a supported format.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  PROCESSING_FAILED: 'Video processing failed. Please try again.',
  EXPORT_FAILED: 'Video export failed. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: 'File uploaded successfully!',
  VIDEO_PROCESSED: 'Video processed successfully!',
  VIDEO_EXPORTED: 'Video exported successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'vfxb_auth_token',
  REFRESH_TOKEN: 'vfxb_refresh_token',
  USER_PREFERENCES: 'vfxb_user_preferences',
  THEME: 'vfxb_theme',
  SIDEBAR_STATE: 'vfxb_sidebar_state',
  RECENT_PROJECTS: 'vfxb_recent_projects',
  CHAT_HISTORY: 'vfxb_chat_history',
  WORKSPACE_LAYOUT: 'vfxb_workspace_layout',
};

// Feature Flags
export const FEATURES = {
  AI_CHAT: true,
  VIDEO_UPLOAD: true,
  REAL_TIME_PROCESSING: true,
  COLLABORATION: false,
  ADVANCED_EFFECTS: false,
  CLOUD_STORAGE: false,
  ANALYTICS: true,
  NOTIFICATIONS: true,
};

// Analytics Events
export const ANALYTICS_EVENTS = {
  // User actions
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  
  // Video actions
  VIDEO_UPLOAD_START: 'video_upload_start',
  VIDEO_UPLOAD_COMPLETE: 'video_upload_complete',
  VIDEO_UPLOAD_FAILED: 'video_upload_failed',
  VIDEO_PROCESS_START: 'video_process_start',
  VIDEO_PROCESS_COMPLETE: 'video_process_complete',
  VIDEO_EXPORT: 'video_export',
  
  // AI interactions
  AI_CHAT_MESSAGE: 'ai_chat_message',
  AI_SUGGESTION_USED: 'ai_suggestion_used',
  AI_OPERATION_EXECUTED: 'ai_operation_executed',
  
  // UI interactions
  SIDEBAR_TOGGLE: 'sidebar_toggle',
  THEME_CHANGE: 'theme_change',
  SHORTCUT_USED: 'shortcut_used',
};

// WebSocket Events
export const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Video processing events
  PROCESSING_START: 'processing_start',
  PROCESSING_PROGRESS: 'processing_progress',
  PROCESSING_COMPLETE: 'processing_complete',
  PROCESSING_ERROR: 'processing_error',
  
  // Chat events
  MESSAGE_RECEIVED: 'message_received',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  
  // Notification events
  NOTIFICATION: 'notification',
};

// Default Settings
export const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'en',
  autoSave: true,
  notifications: true,
  soundEffects: true,
  keyboardShortcuts: true,
  videoQuality: 'high',
  exportFormat: 'mp4',
  sidebarCollapsed: false,
  chatHistory: true,
  analytics: true,
};

// Export all constants as default
export default {
  API_CONFIG,
  API_ENDPOINTS,
  UPLOAD_CONFIG,
  VIDEO_PROCESSING,
  UI_CONFIG,
  THEME_CONFIG,
  CHAT_CONFIG,
  KEYBOARD_SHORTCUTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  FEATURES,
  ANALYTICS_EVENTS,
  WEBSOCKET_EVENTS,
  DEFAULT_SETTINGS,
};