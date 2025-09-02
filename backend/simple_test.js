const http = require('http');

// Simple test to check if we can connect to the server
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/csrf-token',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Testing connection to localhost:5000...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    console.log('✅ Connection successful!');
  });
});

req.on('error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.error('Error details:', error);
});

req.setTimeout(5000, () => {
  console.error('❌ Request timeout');
  req.destroy();
});

req.end();