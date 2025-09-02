console.log('Testing server imports...');

try {
  console.log('Loading express...');
  const express = require('express');
  
  console.log('Loading database...');
  const database = require('./src/config/database');
  
  console.log('Loading OpenAI service...');
  const openaiService = require('./src/services/openaiService');
  
  console.log('Loading routes...');
  const projectRoutes = require('./src/routes/projects');
  const aiRoutes = require('./src/routes/ai');
  const videoRoutes = require('./src/routes/video');
  
  console.log('All imports successful!');
} catch (error) {
  console.error('Import error:', error);
}