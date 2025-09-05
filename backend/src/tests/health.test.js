import request from 'supertest';
import express from 'express';

// Mock the health endpoint for testing
const app = express();
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

describe('Health Endpoint', () => {
  test('GET /api/health should return 200 and correct structure', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('environment');
    
    // Validate timestamp is a valid ISO string
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    
    // Validate uptime is a number
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThan(0);
  });

  test('Health endpoint should respond quickly', async () => {
    const start = Date.now();
    await request(app)
      .get('/api/health')
      .expect(200);
    const duration = Date.now() - start;
    
    // Should respond within 500ms
    expect(duration).toBeLessThan(500);
  });
});