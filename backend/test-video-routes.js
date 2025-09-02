// Simple test to check if video routes can be loaded
console.log('Testing video routes import...');

try {
  const videoRoutes = require('./src/routes/video');
  console.log('✅ Video routes loaded successfully');
  console.log('Routes object:', typeof videoRoutes);
} catch (error) {
  console.error('❌ Error loading video routes:', error.message);
  console.error('Stack:', error.stack);
}

console.log('Test completed.');