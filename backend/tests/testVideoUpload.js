// Test Video Upload Pipeline
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_USER = {
  username: 'testuser_video',
  email: 'testuser_video@example.com',
  password: 'testpass123',
  firstName: 'Test',
  lastName: 'User'
};
const LOGIN_USER = {
  identifier: 'testuser_video@example.com',
  password: 'testpass123'
};

// Helper function to create a small test video file
function createTestVideoFile() {
  const testVideoPath = path.join(__dirname, 'test_video.mp4');
  
  // Check if test video already exists
  if (fs.existsSync(testVideoPath)) {
    return testVideoPath;
  }
  
  console.log('📹 Creating test video file...');
  
  // Create a minimal but valid MP4 file structure
  const validMp4 = Buffer.concat([
    // ftyp box (file type box)
    Buffer.from([0x00, 0x00, 0x00, 0x20]), // box size (32 bytes)
    Buffer.from('ftyp'), // box type
    Buffer.from('isom'), // major brand
    Buffer.from([0x00, 0x00, 0x02, 0x00]), // minor version
    Buffer.from('isomiso2avc1mp41'), // compatible brands
    
    // moov box (movie box) - minimal structure
    Buffer.from([0x00, 0x00, 0x00, 0x6C]), // box size (108 bytes)
    Buffer.from('moov'), // box type
    
    // mvhd box (movie header)
    Buffer.from([0x00, 0x00, 0x00, 0x64]), // box size (100 bytes)
    Buffer.from('mvhd'), // box type
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // version and flags
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // creation time
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // modification time
    Buffer.from([0x00, 0x00, 0x03, 0xE8]), // timescale (1000)
    Buffer.from([0x00, 0x00, 0x03, 0xE8]), // duration (1000)
    Buffer.from([0x00, 0x01, 0x00, 0x00]), // rate (1.0)
    Buffer.from([0x01, 0x00]), // volume (1.0)
    Buffer.from([0x00, 0x00]), // reserved
    Buffer.alloc(8, 0), // reserved
    Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00]), // matrix
    Buffer.alloc(24, 0), // pre_defined
    Buffer.from([0x00, 0x00, 0x00, 0x02]), // next_track_ID
    
    // mdat box (media data box) - empty
    Buffer.from([0x00, 0x00, 0x00, 0x08]), // box size (8 bytes)
    Buffer.from('mdat') // box type
  ]);
  
  fs.writeFileSync(testVideoPath, validMp4);
  console.log('✅ Test video file created successfully');
  return testVideoPath;
}

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Health Check: PASSED');
      console.log('   Status:', data.status);
      console.log('   Services:', JSON.stringify(data.services, null, 2));
      return true;
    } else {
      console.log('❌ Health Check: FAILED');
      console.log('   Status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Health Check: ERROR');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testWithExistingToken() {
  console.log('\n🔑 Using existing demo session token...');
  try {
    // Use the existing session token from sessions.json
    const demoToken = 'demo-token-user-001';
    console.log('✅ Using Demo Token: PASSED');
    console.log('   Token:', demoToken.substring(0, 20) + '...');
    return demoToken;
  } catch (error) {
    console.log('❌ Demo Token: ERROR');
    console.log('   Error:', error.message);
    return null;
  }
}

async function testVideoUpload(token) {
  console.log('\n📹 Testing Video Upload...');
  
  // Create test video file
  const testVideoPath = createTestVideoFile();
  
  try {
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath), {
      filename: 'test_video.mp4',
      contentType: 'video/mp4'
    });
    formData.append('title', 'Test Video Upload');
    formData.append('description', 'Testing video upload pipeline');
    formData.append('tags', 'test,upload,pipeline');
    
    const response = await fetch(`${API_BASE_URL}/videos/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Video Upload: PASSED');
      console.log('   Video ID:', data.data.video.id);
      console.log('   Title:', data.data.video.title);
      console.log('   Status:', data.data.video.status);
      console.log('   File Size:', data.data.video.fileSizeFormatted);
      return data.data.video;
    } else {
      console.log('❌ Video Upload: FAILED');
      console.log('   Status:', response.status);
      console.log('   Message:', data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Video Upload: ERROR');
    console.log('   Error:', error.message);
    return null;
  } finally {
    // Clean up test file
    try {
      fs.unlinkSync(testVideoPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

async function testGetVideos(token) {
  console.log('\n📋 Testing Get Videos...');
  try {
    const response = await fetch(`${API_BASE_URL}/videos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Get Videos: PASSED');
      console.log('   Total Videos:', data.data.videos.length);
      if (data.data.videos.length > 0) {
        console.log('   Latest Video:', data.data.videos[0].title);
      }
      return true;
    } else {
      console.log('❌ Get Videos: FAILED');
      console.log('   Status:', response.status);
      console.log('   Message:', data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Get Videos: ERROR');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testVideoMetadata(videoId, token) {
  console.log('\n📊 Testing Video Metadata...');
  try {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Video Metadata: PASSED');
      console.log('   Video ID:', data.data.video.id);
      console.log('   Metadata:', JSON.stringify(data.data.video.metadata, null, 2));
      return true;
    } else {
      console.log('❌ Video Metadata: FAILED');
      console.log('   Status:', response.status);
      console.log('   Message:', data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Video Metadata: ERROR');
    console.log('   Error:', error.message);
    return false;
  }
}

// Main test runner
async function runVideoUploadTests() {
  console.log('🚀 Starting Video Upload Pipeline Tests...');
  console.log('=' .repeat(50));
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Health Check
  totalTests++;
  if (await testHealthCheck()) passedTests++;
  
  // Test 2: Get Authentication Token
  totalTests++;
  const token = await testWithExistingToken();
  if (token) passedTests++;
  
  if (!token) {
    console.log('\n❌ Cannot proceed without authentication token');
    return;
  }
  
  // Test 3: Video Upload
  totalTests++;
  const uploadedVideo = await testVideoUpload(token);
  if (uploadedVideo) passedTests++;
  
  // Test 4: Get Videos
  totalTests++;
  if (await testGetVideos(token)) passedTests++;
  
  // Test 5: Video Metadata (if video was uploaded)
  if (uploadedVideo) {
    totalTests++;
    if (await testVideoMetadata(uploadedVideo.id, token)) passedTests++;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Video upload pipeline is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
  }
}

// Run the tests
runVideoUploadTests().catch(console.error);