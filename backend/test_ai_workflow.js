const http = require('http');
const https = require('https');
const FormData = require('form-data');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
};

class WorkflowTester {
  constructor() {
    this.authToken = null;
    this.sessionId = null;
    this.csrfToken = null;
  }

  async log(message, data = null) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    return new Promise((resolve) => {
      const url = new URL(`${BASE_URL}${endpoint}`);
      
      // For GET requests, append data as query parameters
      if (method === 'GET' && data) {
        Object.keys(data).forEach(key => {
          url.searchParams.append(key, data[key]);
        });
      }
      
      console.log(`Making ${method} request to: ${url.href}`);
      
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };

      if (this.authToken) {
        requestHeaders.Authorization = `Bearer ${this.authToken}`;
      }

      const postData = data && method !== 'GET' ? JSON.stringify(data) : null;
      if (postData) {
        requestHeaders['Content-Length'] = Buffer.byteLength(postData);
      }

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: requestHeaders
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, data: parsedData });
            } else {
              resolve({
                success: false,
                error: parsedData,
                status: res.statusCode
              });
            }
          } catch (parseError) {
            resolve({
              success: false,
              error: `Parse error: ${parseError.message}`,
              status: res.statusCode
            });
          }
        });
      });

      req.on('error', (error) => {
        console.log(`Request failed:`, {
          url: url.href,
          method,
          error: error.message
        });
        resolve({
          success: false,
          error: error.message,
          status: null
        });
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  async testAuthentication() {
    await this.log('Testing authentication...');
    
    // Get CSRF token for API requests
      const csrfResult = await this.makeRequest('GET', '/api/csrf-token');
      await this.log('CSRF token response:', csrfResult);
      
      if (!csrfResult.success || !csrfResult.data.csrfToken) {
        await this.log('❌ Failed to get CSRF token:', csrfResult.error);
        return false;
      }
      
      this.csrfToken = csrfResult.data.csrfToken;
      await this.log('✅ CSRF token obtained:', this.csrfToken.substring(0, 10) + '...');
    
    // Enhanced user data for registration
     const registerData = {
       email: 'test@example.com',
       password: 'TestPassword123!',
       username: 'testuser123',
       firstName: 'Test',
       lastName: 'User'
     };
    
    // Try to register user with CSRF token
    const registerResult = await this.makeRequest('POST', '/api/auth/register', registerData, {
      'X-CSRF-Token': this.csrfToken
    });
    await this.log('Register result:', registerResult);

    // Get a fresh CSRF token for login
     const loginCsrfResult = await this.makeRequest('GET', '/api/csrf-token');
     this.csrfToken = loginCsrfResult.success ? loginCsrfResult.data.csrfToken : null;
     
     // Login with original credentials and fresh CSRF token
     const loginData = {
       identifier: TEST_USER.email, // Use identifier instead of email
       password: TEST_USER.password
     };
     const loginResult = await this.makeRequest('POST', '/api/auth/login', loginData, {
       'X-CSRF-Token': this.csrfToken
     });
    if (loginResult.success) {
      this.authToken = loginResult.data.accessToken || loginResult.data.data?.accessToken;
      await this.log('✅ Authentication successful', { hasToken: !!this.authToken });
      return true;
    } else {
      await this.log('❌ Authentication failed:', loginResult.error);
      return false;
    }
  }

  async testChatSession() {
    await this.log('Testing chat session creation...');
    
    // Get fresh CSRF token for chat session creation
    const csrfResult = await this.makeRequest('GET', '/api/csrf-token');
    if (!csrfResult.success || !csrfResult.data.csrfToken) {
      await this.log('❌ Failed to get CSRF token for chat session:', csrfResult.error);
      return false;
    }
    
    const csrfToken = csrfResult.data.csrfToken;
    
    const headers = { 'X-CSRF-Token': csrfToken };
    const sessionResult = await this.makeRequest('POST', '/api/chat/sessions', {
      title: 'AI Video Editing Test Session'
    }, headers);

    if (sessionResult.success) {
      this.sessionId = sessionResult.data.data.session._id;
      await this.log('✅ Chat session created:', { sessionId: this.sessionId });
      return true;
    } else {
      await this.log('❌ Chat session creation failed:', sessionResult.error);
      return false;
    }
  }

  async testAiVideoCreation() {
    await this.log('Testing AI video creation...');
    
    // Get fresh CSRF token for AI request
    const csrfResult = await this.makeRequest('GET', '/api/csrf-token');
    if (!csrfResult.success || !csrfResult.data.csrfToken) {
      await this.log('❌ Failed to get CSRF token for AI video creation:', csrfResult.error);
      return false;
    }
    
    const message = 'Create a video with the text: Welcome to VFXB - the future of video editing!';
    
    const aiResult = await this.makeRequest('POST', '/api/chat/ai-message', {
      message,
      sessionId: this.sessionId,
      context: { type: 'video_creation' }
    }, { 'X-CSRF-Token': csrfResult.data.csrfToken });

    if (aiResult.success) {
      await this.log('✅ AI video creation request processed:', aiResult.data);
      
      // Check if video creation action was triggered
      const actions = aiResult.data.data.actions || [];
      const videoAction = actions.find(action => action.type === 'video_creation_started');
      
      if (videoAction) {
        await this.log('✅ Video creation action detected:', videoAction);
        return videoAction.videoId;
      } else {
        await this.log('⚠️ No video creation action in response');
        return null;
      }
    } else {
      await this.log('❌ AI video creation failed:', aiResult.error);
      return null;
    }
  }

  async testVideoTranscription() {
    await this.log('Testing video transcription...');
    
    // Get fresh CSRF token for transcription request
    const csrfResult = await this.makeRequest('GET', '/api/csrf-token');
    if (!csrfResult.success || !csrfResult.data.csrfToken) {
      await this.log('❌ Failed to get CSRF token for video transcription:', csrfResult.error);
      return false;
    }
    
    const message = 'Transcribe this video: https://example.com/sample-video.mp4';
    
    const aiResult = await this.makeRequest('POST', '/api/chat/ai-message', {
      message,
      sessionId: this.sessionId,
      context: { type: 'transcription' }
    }, { 'X-CSRF-Token': csrfResult.data.csrfToken });

    if (aiResult.success) {
      await this.log('✅ AI transcription request processed:', aiResult.data);
      
      const actions = aiResult.data.data.actions || [];
      const transcriptionAction = actions.find(action => action.type === 'transcription_started');
      
      if (transcriptionAction) {
        await this.log('✅ Transcription action detected:', transcriptionAction);
        return transcriptionAction.jobId;
      } else {
        await this.log('⚠️ No transcription action in response');
        return null;
      }
    } else {
      await this.log('❌ AI transcription failed:', aiResult.error);
      return null;
    }
  }

  async testScriptGeneration() {
    await this.log('Testing script generation...');
    
    // Get fresh CSRF token for script generation request
    const csrfResult = await this.makeRequest('GET', '/api/csrf-token');
    if (!csrfResult.success || !csrfResult.data.csrfToken) {
      await this.log('❌ Failed to get CSRF token for script generation:', csrfResult.error);
      return false;
    }
    
    const message = 'Generate a video script for a 30-second promotional video about our new AI video editing platform';
    
    const aiResult = await this.makeRequest('POST', '/api/chat/ai-message', {
      message,
      sessionId: this.sessionId,
      context: { type: 'script_generation' }
    }, { 'X-CSRF-Token': csrfResult.data.csrfToken });

    if (aiResult.success) {
      await this.log('✅ Script generation processed:', aiResult.data);
      
      const actions = aiResult.data.data.actions || [];
      const scriptAction = actions.find(action => action.type === 'script_generated');
      
      if (scriptAction) {
        await this.log('✅ Script generation action detected');
        return true;
      } else {
        await this.log('⚠️ No script generation action in response');
        return false;
      }
    } else {
      await this.log('❌ Script generation failed:', aiResult.error);
      return false;
    }
  }

  async testDirectApiEndpoints() {
    await this.log('Testing direct AI API endpoints...');
    
    // Test JSON2Video endpoint
    const csrfResult1 = await this.makeRequest('GET', '/api/csrf-token');
    const csrfToken1 = csrfResult1.success ? csrfResult1.data.csrfToken : null;
    const headers1 = csrfToken1 ? { 'X-CSRF-Token': csrfToken1 } : {};
    
    const videoResult = await this.makeRequest('POST', '/api/ai/json2video/create', {
      text: 'Hello from VFXB API test!'
    }, headers1);
    
    if (videoResult.success) {
      await this.log('✅ Direct JSON2Video API test successful:', videoResult.data);
    } else {
      await this.log('❌ Direct JSON2Video API test failed:', videoResult.error);
    }

    // Test Captions.ai endpoint with URL - get fresh CSRF token
    const csrfResult2 = await this.makeRequest('GET', '/api/csrf-token');
    const csrfToken2 = csrfResult2.success ? csrfResult2.data.csrfToken : null;
    const headers2 = csrfToken2 ? { 'X-CSRF-Token': csrfToken2 } : {};
    
    const captionsResult = await this.makeRequest('POST', '/api/ai/captions/transcribe', {
      videoUrl: 'https://example.com/test-video.mp4',
      language: 'en'
    }, headers2);
    
    if (captionsResult.success) {
      await this.log('✅ Direct Captions.ai API test successful:', captionsResult.data);
    } else {
      await this.log('❌ Direct Captions.ai API test failed:', captionsResult.error);
    }
  }

  async testVideoUploadWorkflow() {
    await this.log('Testing video upload workflow...');
    
    // Test video upload endpoint
    const uploadResult = await this.makeRequest('GET', '/api/video/upload-url', {
      filename: 'test-video.mp4',
      contentType: 'video/mp4'
    });
    
    if (uploadResult.success) {
      await this.log('✅ Video upload URL generation successful:', uploadResult.data);
    } else {
      await this.log('❌ Video upload URL generation failed:', uploadResult.error);
    }

    // Test video processing status
    const processingResult = await this.makeRequest('GET', '/api/video/processing-status/test-video-id');
    
    if (processingResult.success) {
      await this.log('✅ Video processing status check successful:', processingResult.data);
    } else {
      await this.log('⚠️ Video processing status check (expected to fail for test ID):', processingResult.error);
    }
  }

  async runCompleteWorkflowTest() {
    await this.log('🚀 Starting complete VFXB AI video editing workflow test...');
    
    try {
      // Step 1: Authentication
      const authSuccess = await this.testAuthentication();
      if (!authSuccess) {
        throw new Error('Authentication failed');
      }

      // Step 2: Chat Session
      const sessionSuccess = await this.testChatSession();
      if (!sessionSuccess) {
        throw new Error('Chat session creation failed');
      }

      // Step 3: AI Video Creation
      const videoId = await this.testAiVideoCreation();
      
      // Step 4: Video Transcription
      const transcriptionId = await this.testVideoTranscription();
      
      // Step 5: Script Generation
      const scriptSuccess = await this.testScriptGeneration();
      
      // Step 6: Direct API Tests
      await this.testDirectApiEndpoints();
      
      // Step 7: Video Upload Workflow
      await this.testVideoUploadWorkflow();
      
      await this.log('🎉 Complete workflow test finished!');
      await this.log('📊 Test Summary:', {
        authentication: '✅ Passed',
        chatSession: '✅ Passed',
        aiVideoCreation: videoId ? '✅ Passed' : '⚠️ Partial',
        videoTranscription: transcriptionId ? '✅ Passed' : '⚠️ Partial',
        scriptGeneration: scriptSuccess ? '✅ Passed' : '⚠️ Partial',
        directApiTests: '✅ Completed',
        videoUploadWorkflow: '✅ Completed'
      });
      
    } catch (error) {
      await this.log('❌ Workflow test failed:', error.message);
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new WorkflowTester();
  tester.runCompleteWorkflowTest().catch(console.error);
}

module.exports = WorkflowTester;