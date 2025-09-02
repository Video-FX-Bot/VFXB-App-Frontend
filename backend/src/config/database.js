const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Database Configuration
 * Handles MongoDB connection and configuration
 */
class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      // Skip MongoDB connection if using local storage
      if (process.env.USE_LOCAL_STORAGE === 'true') {
        logger.info('Using local storage mode - skipping MongoDB connection');
        this.isConnected = true;
        return null;
      }
      
      // MongoDB connection string - fallback to local if not provided
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vfxb_app';
      
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferMaxEntries: 0, // Disable mongoose buffering
        bufferCommands: false, // Disable mongoose buffering
      };

      // Connect to MongoDB
      this.connection = await mongoose.connect(mongoUri, options);
      this.isConnected = true;
      
      logger.info('Successfully connected to MongoDB', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        database: this.connection.connection.name
      });

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        logger.info('Disconnected from MongoDB');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  isHealthy() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get database connection status
   */
  getStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      status: states[mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name
    };
  }

  /**
   * Initialize database with indexes and default data
   */
  async initialize() {
    try {
      // Skip MongoDB operations if using local storage
      if (process.env.USE_LOCAL_STORAGE === 'true') {
        logger.info('Using local storage mode - skipping database initialization');
        return;
      }
      
      if (!this.isHealthy()) {
        throw new Error('Database not connected');
      }

      // Ensure indexes are created for all models
      const Project = require('../models/ProjectSchema');
      const { UserSchema } = require('../models/UserSchema');
      const { ChatSession, ChatMessage } = require('../models/ChatSchema');
      
      await Project.createIndexes();
      await UserSchema.createIndexes();
      await ChatSession.createIndexes();
      
      logger.info('Database indexes created successfully for all models');
      
      // Add any default data initialization here if needed
      await this.seedDefaultData();
      
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Seed default data (for development)
   */
  async seedDefaultData() {
    try {
      const Project = require('../models/ProjectSchema');
      
      // Check if we already have projects
      const existingProjects = await Project.countDocuments();
      
      if (existingProjects === 0) {
        // Create sample projects for development
        const sampleProjects = [
          {
            title: 'Sample Project 1',
            description: 'A sample video editing project for testing',
            ownerId: 'user-1',
            status: 'draft',
            stateJson: {
              timeline: {
                tracks: [],
                duration: 0,
                currentTime: 0
              },
              editPlan: {
                steps: [],
                currentStep: 0
              },
              chatHistory: []
            },
            assets: [],
            category: 'demo'
          },
          {
            title: 'Demo Project 2',
            description: 'Another demo project for testing features',
            ownerId: 'user-1',
            status: 'completed',
            stateJson: {
              timeline: {
                tracks: [
                  {
                    id: 'track-1',
                    type: 'video',
                    clips: []
                  }
                ],
                duration: 30,
                currentTime: 0
              },
              editPlan: {
                steps: [
                  {
                    id: 'step-1',
                    type: 'trim',
                    description: 'Trim video to 30 seconds'
                  }
                ],
                currentStep: 1
              },
              chatHistory: [
                {
                  role: 'user',
                  content: 'Please trim this video to 30 seconds',
                  timestamp: new Date()
                }
              ]
            },
            assets: [],
            category: 'demo'
          }
        ];

        await Project.insertMany(sampleProjects);
        logger.info(`Seeded ${sampleProjects.length} sample projects`);
      }
    } catch (error) {
      logger.error('Failed to seed default data:', error);
      // Don't throw error for seeding failures in development
    }
  }

  /**
   * Clean up database (for testing)
   */
  async cleanup() {
    try {
      if (process.env.NODE_ENV === 'test') {
        await mongoose.connection.db.dropDatabase();
        logger.info('Test database cleaned up');
      }
    } catch (error) {
      logger.error('Failed to cleanup database:', error);
      throw error;
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;