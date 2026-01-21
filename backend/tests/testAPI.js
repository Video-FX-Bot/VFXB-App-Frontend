import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const BASE_URL = 'http://localhost:5000';

// Test data - create a new user for testing
const newUser = {
  username: 'api_test_user',
  email: 'apitest@example.com',
  password: 'testpass123',
  firstName: 'API',
  lastName: 'Test'
};

// Login credentials for the user we'll create
const testUser = {
  identifier: 'apitest@example.com',
  password: 'testpass123'
};

async function testAPI() {
  console.log('🧪 Testing VFXB API Endpoints...');
  console.log('=' .repeat(50));

  try {
    // Test 1: Health Check
    console.log('\n1. Testing Health Check...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', healthData.status);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }

    // Test 2: User Registration
    console.log('\n2. Testing User Registration...');
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newUser)
    });
    
    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ Registration successful:', registerData.message);
    } else {
      const errorData = await registerResponse.json();
      console.log('❌ Registration failed:', errorData.message || registerResponse.status);
      if (errorData.errors) {
        console.log('   Validation errors:', errorData.errors);
      }
    }

    // Test 3: User Login with existing user
    console.log('\n3. Testing User Login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful:', loginData.message);
      
      // Store token for authenticated requests
      const cookies = loginResponse.headers.get('set-cookie');
      if (cookies) {
        console.log('   Cookies received for authentication');
      }
      
      // Test 4: Protected Route (if any)
      if (loginData.token) {
        console.log('\n4. Testing Protected Route...');
        const protectedResponse = await fetch(`${BASE_URL}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${loginData.token}`
          }
        });
        
        if (protectedResponse.ok) {
          const profileData = await protectedResponse.json();
          console.log('✅ Protected route access successful');
        } else {
          console.log('❌ Protected route access failed:', protectedResponse.status);
        }
      }
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData.message || loginResponse.status);
    }

    // Test 5: Projects API (without auth - should fail)
    console.log('\n5. Testing Projects API (no auth)...');
    const projectsResponse = await fetch(`${BASE_URL}/api/projects`);
    if (projectsResponse.status === 401) {
      console.log('✅ Projects API correctly requires authentication');
    } else if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json();
      console.log('✅ Projects API accessible:', projectsData.length, 'projects found');
    } else {
      console.log('❌ Projects API failed:', projectsResponse.status);
    }

    // Test 6: Videos API (without auth - should fail)
    console.log('\n6. Testing Videos API (no auth)...');
    const videosResponse = await fetch(`${BASE_URL}/api/videos`);
    if (videosResponse.status === 401) {
      console.log('✅ Videos API correctly requires authentication');
    } else if (videosResponse.ok) {
      const videosData = await videosResponse.json();
      console.log('✅ Videos API accessible:', videosData.length, 'videos found');
    } else {
      console.log('❌ Videos API failed:', videosResponse.status);
    }

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🏁 API Testing Complete');
}

// Run tests if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testAPI();
}

export { testAPI };