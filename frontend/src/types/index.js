// Type definitions for the VFXB application
// Note: These are JSDoc type definitions for better IDE support in JavaScript

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} username - Username
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} avatar - Avatar URL
 * @property {string} role - User role (user, admin, etc.)
 * @property {Date} createdAt - Account creation date
 * @property {Date} updatedAt - Last update date
 * @property {UserSettings} settings - User settings
 * @property {Subscription} subscription - User subscription
 */

/**
 * @typedef {Object} UserSettings
 * @property {string} theme - Theme preference (light, dark, auto)
 * @property {string} language - Language preference
 * @property {boolean} autoSave - Auto-save preference
 * @property {boolean} notifications - Notifications enabled
 * @property {boolean} soundEffects - Sound effects enabled
 * @property {boolean} keyboardShortcuts - Keyboard shortcuts enabled
 * @property {string} videoQuality - Default video quality
 * @property {string} exportFormat - Default export format
 * @property {boolean} sidebarCollapsed - Sidebar state
 * @property {boolean} chatHistory - Chat history enabled
 * @property {boolean} analytics - Analytics enabled
 */

/**
 * @typedef {Object} Subscription
 * @property {string} id - Subscription ID
 * @property {string} plan - Plan name (free, pro, enterprise)
 * @property {string} status - Subscription status
 * @property {Date} startDate - Subscription start date
 * @property {Date} endDate - Subscription end date
 * @property {boolean} autoRenew - Auto-renewal enabled
 * @property {SubscriptionLimits} limits - Usage limits
 */

/**
 * @typedef {Object} SubscriptionLimits
 * @property {number} maxFileSize - Maximum file size in bytes
 * @property {number} maxVideosPerMonth - Maximum videos per month
 * @property {number} maxStorageGB - Maximum storage in GB
 * @property {boolean} aiFeatures - AI features enabled
 * @property {boolean} advancedEffects - Advanced effects enabled
 * @property {boolean} cloudStorage - Cloud storage enabled
 */

/**
 * @typedef {Object} Video
 * @property {string} id - Video ID
 * @property {string} userId - Owner user ID
 * @property {string} title - Video title
 * @property {string} description - Video description
 * @property {string} filename - Original filename
 * @property {string} url - Video URL
 * @property {string} thumbnailUrl - Thumbnail URL
 * @property {VideoMetadata} metadata - Video metadata
 * @property {string} status - Processing status
 * @property {number} progress - Processing progress (0-100)
 * @property {Date} createdAt - Upload date
 * @property {Date} updatedAt - Last update date
 * @property {VideoSettings} settings - Video settings
 * @property {EditHistory[]} editHistory - Edit history
 */

/**
 * @typedef {Object} VideoMetadata
 * @property {number} duration - Duration in seconds
 * @property {number} width - Video width
 * @property {number} height - Video height
 * @property {number} fps - Frames per second
 * @property {string} format - Video format
 * @property {number} bitrate - Video bitrate
 * @property {number} fileSize - File size in bytes
 * @property {AudioMetadata} audio - Audio metadata
 * @property {string} codec - Video codec
 * @property {string} colorSpace - Color space
 */

/**
 * @typedef {Object} AudioMetadata
 * @property {string} codec - Audio codec
 * @property {number} bitrate - Audio bitrate
 * @property {number} sampleRate - Sample rate
 * @property {number} channels - Number of channels
 * @property {number} duration - Audio duration
 */

/**
 * @typedef {Object} VideoSettings
 * @property {string} quality - Video quality setting
 * @property {string} format - Export format
 * @property {boolean} autoEnhance - Auto-enhancement enabled
 * @property {ColorSettings} color - Color settings
 * @property {AudioSettings} audio - Audio settings
 * @property {SubtitleSettings} subtitles - Subtitle settings
 */

/**
 * @typedef {Object} ColorSettings
 * @property {number} brightness - Brightness (-100 to 100)
 * @property {number} contrast - Contrast (-100 to 100)
 * @property {number} saturation - Saturation (-100 to 100)
 * @property {number} hue - Hue (-180 to 180)
 * @property {number} gamma - Gamma (0.1 to 3.0)
 */

/**
 * @typedef {Object} AudioSettings
 * @property {number} volume - Volume (0 to 200)
 * @property {boolean} noiseReduction - Noise reduction enabled
 * @property {number} bass - Bass (-20 to 20)
 * @property {number} treble - Treble (-20 to 20)
 * @property {boolean} normalize - Audio normalization
 */

/**
 * @typedef {Object} SubtitleSettings
 * @property {boolean} enabled - Subtitles enabled
 * @property {string} language - Subtitle language
 * @property {string} fontFamily - Font family
 * @property {number} fontSize - Font size
 * @property {string} fontColor - Font color
 * @property {string} backgroundColor - Background color
 * @property {string} position - Position (top, center, bottom)
 */

/**
 * @typedef {Object} EditHistory
 * @property {string} id - Edit ID
 * @property {string} operation - Operation type
 * @property {Object} parameters - Operation parameters
 * @property {Date} timestamp - Edit timestamp
 * @property {string} description - Human-readable description
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id - Message ID
 * @property {string} type - Message type (user, ai, system, error)
 * @property {string} content - Message content
 * @property {Date} timestamp - Message timestamp
 * @property {ChatAction[]} actions - Available actions
 * @property {Object} metadata - Additional metadata
 * @property {boolean} isTyping - Typing indicator
 */

/**
 * @typedef {Object} ChatAction
 * @property {string} id - Action ID
 * @property {string} label - Action label
 * @property {string} type - Action type
 * @property {Function} onClick - Click handler
 * @property {Object} parameters - Action parameters
 * @property {boolean} disabled - Action disabled state
 */

/**
 * @typedef {Object} AIContext
 * @property {string} videoId - Current video ID
 * @property {string} sessionId - Chat session ID
 * @property {Object} videoMetadata - Video metadata
 * @property {string[]} capabilities - Available AI capabilities
 * @property {Object} preferences - User preferences
 * @property {EditHistory[]} editHistory - Recent edit history
 */

/**
 * @typedef {Object} ProcessingJob
 * @property {string} id - Job ID
 * @property {string} videoId - Video ID
 * @property {string} operation - Operation type
 * @property {Object} parameters - Operation parameters
 * @property {string} status - Job status (pending, processing, completed, failed)
 * @property {number} progress - Progress percentage (0-100)
 * @property {Date} startTime - Job start time
 * @property {Date} endTime - Job end time
 * @property {string} error - Error message if failed
 * @property {Object} result - Job result
 */

/**
 * @typedef {Object} ExportOptions
 * @property {string} format - Export format (mp4, webm, avi, mov)
 * @property {string} quality - Quality preset (low, medium, high, ultra)
 * @property {number} width - Custom width
 * @property {number} height - Custom height
 * @property {number} bitrate - Custom bitrate
 * @property {number} fps - Custom frame rate
 * @property {boolean} includeAudio - Include audio
 * @property {string} audioCodec - Audio codec
 * @property {number} audioBitrate - Audio bitrate
 */

/**
 * @typedef {Object} UploadProgress
 * @property {string} fileId - File ID
 * @property {string} filename - Filename
 * @property {number} size - File size
 * @property {number} uploaded - Bytes uploaded
 * @property {number} progress - Progress percentage (0-100)
 * @property {number} speed - Upload speed in bytes/second
 * @property {number} timeRemaining - Estimated time remaining in seconds
 * @property {string} status - Upload status
 * @property {string} error - Error message if failed
 */

/**
 * @typedef {Object} Notification
 * @property {string} id - Notification ID
 * @property {string} type - Notification type (info, success, warning, error)
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {Date} timestamp - Notification timestamp
 * @property {boolean} read - Read status
 * @property {Object} action - Optional action
 * @property {number} duration - Auto-dismiss duration in ms
 */

/**
 * @typedef {Object} UIState
 * @property {string} theme - Current theme
 * @property {boolean} sidebarOpen - Sidebar open state
 * @property {boolean} sidebarCollapsed - Sidebar collapsed state
 * @property {string} activeTab - Active sidebar tab
 * @property {boolean} modalOpen - Modal open state
 * @property {Object} modalProps - Modal properties
 * @property {boolean} loading - Global loading state
 * @property {string} loadingMessage - Loading message
 * @property {Notification[]} notifications - Active notifications
 * @property {Object} layout - Layout configuration
 * @property {Object} workspace - Workspace state
 */

/**
 * @typedef {Object} VideoStore
 * @property {Video[]} videos - Video list
 * @property {Video|null} currentVideo - Currently selected video
 * @property {boolean} isPlaying - Playback state
 * @property {number} currentTime - Current playback time
 * @property {number} volume - Volume level (0-1)
 * @property {boolean} muted - Mute state
 * @property {boolean} fullscreen - Fullscreen state
 * @property {string} playbackRate - Playback rate
 * @property {ProcessingJob[]} processingJobs - Active processing jobs
 * @property {EditHistory[]} editHistory - Edit history
 * @property {Object} timeline - Timeline state
 */

/**
 * @typedef {Object} ChatStore
 * @property {ChatMessage[]} messages - Chat messages
 * @property {boolean} isTyping - AI typing state
 * @property {string} currentInput - Current input text
 * @property {AIContext} context - AI context
 * @property {string[]} suggestions - Suggested actions
 * @property {Object} analytics - Chat analytics
 * @property {string} sessionId - Current session ID
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Success status
 * @property {*} data - Response data
 * @property {string} message - Response message
 * @property {string} error - Error message
 * @property {number} status - HTTP status code
 * @property {Object} metadata - Additional metadata
 */

/**
 * @typedef {Object} ApiError
 * @property {string} message - Error message
 * @property {string} code - Error code
 * @property {number} status - HTTP status code
 * @property {Object} details - Error details
 * @property {Date} timestamp - Error timestamp
 */

/**
 * @typedef {Object} FileValidation
 * @property {boolean} isValid - Validation result
 * @property {string[]} errors - Validation errors
 * @property {Object} metadata - File metadata
 */

/**
 * @typedef {Object} KeyboardShortcut
 * @property {string} key - Key combination
 * @property {string} description - Shortcut description
 * @property {Function} handler - Shortcut handler
 * @property {boolean} global - Global shortcut
 * @property {string[]} contexts - Valid contexts
 */

/**
 * @typedef {Object} AnalyticsEvent
 * @property {string} event - Event name
 * @property {Object} properties - Event properties
 * @property {Date} timestamp - Event timestamp
 * @property {string} userId - User ID
 * @property {string} sessionId - Session ID
 */

/**
 * @typedef {Object} WebSocketMessage
 * @property {string} type - Message type
 * @property {Object} payload - Message payload
 * @property {string} id - Message ID
 * @property {Date} timestamp - Message timestamp
 */

// Export types for better IDE support
export const Types = {
  User: /** @type {User} */ ({}),
  Video: /** @type {Video} */ ({}),
  ChatMessage: /** @type {ChatMessage} */ ({}),
  ProcessingJob: /** @type {ProcessingJob} */ ({}),
  Notification: /** @type {Notification} */ ({}),
  UIState: /** @type {UIState} */ ({}),
  ApiResponse: /** @type {ApiResponse} */ ({}),
};

export default Types;