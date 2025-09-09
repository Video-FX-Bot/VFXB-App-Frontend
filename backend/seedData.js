import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data for seeding
const sampleUsers = [
  {
    "_id": "user_001",
    "username": "demo_user",
    "email": "demo@vfxb.com",
    "password": "$2b$10$rOvHPGkwMkMZF8c8qGqOUeX.Zt8Z9vQqF8c8qGqOUeX.Zt8Z9vQqF8",
    "firstName": "Demo",
    "lastName": "User",
    "role": "user",
    "isActive": true,
    "emailVerified": true,
    "subscription": {
      "plan": "free",
      "status": "active",
      "expiresAt": null
    },
    "preferences": {
      "theme": "dark",
      "notifications": true,
      "autoSave": true
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  {
    "_id": "user_002",
    "username": "john_editor",
    "email": "john@example.com",
    "password": "$2b$10$rOvHPGkwMkMZF8c8qGqOUeX.Zt8Z9vQqF8c8qGqOUeX.Zt8Z9vQqF8",
    "firstName": "John",
    "lastName": "Editor",
    "role": "user",
    "isActive": true,
    "emailVerified": true,
    "subscription": {
      "plan": "pro",
      "status": "active",
      "expiresAt": "2024-12-31T23:59:59.000Z"
    },
    "preferences": {
      "theme": "light",
      "notifications": true,
      "autoSave": true
    },
    "createdAt": "2024-01-10T08:30:00.000Z",
    "updatedAt": "2024-01-20T14:15:00.000Z"
  }
];

const sampleProjects = [
  {
    "_id": "project_001",
    "userId": "user_001",
    "name": "My First Video Project",
    "description": "A sample video editing project",
    "status": "active",
    "settings": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "duration": 120
    },
    "timeline": {
      "tracks": [
        {
          "id": "track_1",
          "type": "video",
          "clips": []
        },
        {
          "id": "track_2",
          "type": "audio",
          "clips": []
        }
      ]
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  {
    "_id": "project_002",
    "userId": "user_002",
    "name": "Marketing Video Campaign",
    "description": "Professional marketing video with effects",
    "status": "active",
    "settings": {
      "resolution": "1920x1080",
      "frameRate": 24,
      "duration": 60
    },
    "timeline": {
      "tracks": [
        {
          "id": "track_1",
          "type": "video",
          "clips": []
        },
        {
          "id": "track_2",
          "type": "audio",
          "clips": []
        }
      ]
    },
    "createdAt": "2024-01-12T14:20:00.000Z",
    "updatedAt": "2024-01-18T16:45:00.000Z"
  }
];

const sampleVideos = [
  {
    "_id": "video_001",
    "userId": "user_001",
    "projectId": "project_001",
    "filename": "sample_video_1.mp4",
    "originalName": "My Sample Video.mp4",
    "path": "/uploads/videos/sample_video_1.mp4",
    "size": 15728640,
    "duration": 30,
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "frameRate": 30,
    "format": "mp4",
    "codec": "h264",
    "status": "processed",
    "thumbnailPath": "/uploads/thumbnails/sample_video_1_thumb.jpg",
    "createdAt": "2024-01-15T10:35:00.000Z",
    "updatedAt": "2024-01-15T10:40:00.000Z"
  },
  {
    "_id": "video_002",
    "userId": "user_002",
    "projectId": "project_002",
    "filename": "marketing_clip.mp4",
    "originalName": "Marketing Footage.mp4",
    "path": "/uploads/videos/marketing_clip.mp4",
    "size": 25165824,
    "duration": 45,
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "frameRate": 24,
    "format": "mp4",
    "codec": "h264",
    "status": "processed",
    "thumbnailPath": "/uploads/thumbnails/marketing_clip_thumb.jpg",
    "createdAt": "2024-01-12T14:25:00.000Z",
    "updatedAt": "2024-01-12T14:30:00.000Z"
  }
];

const sampleChatMessages = [
  {
    "_id": "msg_001",
    "userId": "user_001",
    "conversationId": "conv_001",
    "videoId": "video_001",
    "message": "Can you help me trim this video to 20 seconds?",
    "type": "user",
    "timestamp": "2024-01-15T10:45:00.000Z"
  },
  {
    "_id": "msg_002",
    "userId": "user_001",
    "conversationId": "conv_001",
    "videoId": "video_001",
    "message": "I'll help you trim your video to 20 seconds. Please specify which part you'd like to keep.",
    "type": "ai",
    "intent": {
      "action": "trim",
      "confidence": 0.95
    },
    "timestamp": "2024-01-15T10:45:05.000Z"
  }
];

const sampleSessions = [
  {
    "_id": "session_001",
    "userId": "user_001",
    "token": "demo-token-user-001",
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "lastActivity": "2024-01-15T11:00:00.000Z"
  }
];

// Seed function
async function seedDatabase() {
  try {
    const dataPath = path.join(__dirname, 'data');
    
    // Ensure data directory exists
    await fs.mkdir(dataPath, { recursive: true });
    
    // Write sample data to files
    await fs.writeFile(path.join(dataPath, 'users.json'), JSON.stringify(sampleUsers, null, 2));
    await fs.writeFile(path.join(dataPath, 'projects.json'), JSON.stringify(sampleProjects, null, 2));
    await fs.writeFile(path.join(dataPath, 'videos.json'), JSON.stringify(sampleVideos, null, 2));
    await fs.writeFile(path.join(dataPath, 'chatMessages.json'), JSON.stringify(sampleChatMessages, null, 2));
    await fs.writeFile(path.join(dataPath, 'sessions.json'), JSON.stringify(sampleSessions, null, 2));
    
    console.log('✅ Database seeded successfully!');
    console.log('📊 Sample data created:');
    console.log(`   - ${sampleUsers.length} users`);
    console.log(`   - ${sampleProjects.length} projects`);
    console.log(`   - ${sampleVideos.length} videos`);
    console.log(`   - ${sampleChatMessages.length} chat messages`);
    console.log(`   - ${sampleSessions.length} sessions`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase();
}

export { seedDatabase };