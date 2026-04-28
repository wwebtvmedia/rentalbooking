import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

let mongodb;
let request;
let app;

describe('Comprehensive Use-Case & Security Tests', () => {
  beforeAll(async () => {
    mongodb = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGO_URI = mongodb.getUri();
    process.env.AUTH_JWT_SECRET = 'correct-secret';
    process.env.NODE_ENV = 'test';
    
    // Import app after setting env
    const serverFile = await import('../src/index.js');
    app = serverFile.default;
    request = supertest(app);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongodb.stop();
  });

  describe('Wrong Usage (Input Validation)', () => {
    it('ERR-2: should reject booking with end date before start date', async () => {
      const login = await request.post('/auth/login').send({ email: 'user@test.com' });
      const token = login.body.token;

      const res = await request.post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Test User',
          email: 'user@test.com',
          apartmentId: new mongoose.Types.ObjectId().toString(),
          start: '2026-12-20T10:00:00Z',
          end: '2026-12-10T10:00:00Z' // Invalid: end < start
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid start\/end/i);
    });

    it('ERR-3: should reject booking with missing required fields', async () => {
        const login = await request.post('/auth/login').send({ email: 'user2@test.com' });
        const token = login.body.token;
  
        const res = await request.post('/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test User',
            // email is missing
            apartmentId: new mongoose.Types.ObjectId().toString(),
            start: '2026-12-20T10:00:00Z',
            end: '2026-12-21T10:00:00Z'
          });
        
        expect(res.status).toBe(400);
    });
  });

  describe('Security Boundaries', () => {
    it('SEC-3: should block Guest user from accessing Admin Platform Stats', async () => {
      const login = await request.post('/auth/login').send({ email: 'guest@test.com' });
      const token = login.body.token;

      const res = await request.get('/admin/platform/stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('SEC-5: should reject JWT tokens signed with an incorrect secret', async () => {
        const forgedToken = jwt.sign(
            { sub: 'hacker', roles: ['admin'] }, 
            'WRONG_SECRET_123', 
            { expiresIn: '1h' }
        );

        const res = await request.get('/admin/platform/stats')
            .set('Authorization', `Bearer ${forgedToken}`);
        
        // Should be 401 because it's treated as an unauthenticated request
        expect(res.status).toBe(401);
    });

    it('SEC-6: should ensure customer registration is idempotent and doesnt leak data', async () => {
        const email = 'unique@test.com';
        // First creation
        const res1 = await request.post('/auth/login').send({ name: 'Original', email });
        expect(res1.status).toBe(200);
        const id1 = res1.body.user.id;

        // Second creation with same email
        const res2 = await request.post('/auth/login').send({ name: 'Imposter', email });
        expect(res2.status).toBe(200); // Should return 200 (existing)
        expect(res2.body.user.id).toBe(id1);
        // Ensure name wasn't updated to 'Imposter'
        expect(res2.body.user.fullName).toBe('Original');
    });
  });
});
