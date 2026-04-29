const supertest = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

jest.setTimeout(60000);

let request;
let adminToken;
let serverProcess;
let mongodb;

const { spawn } = require('child_process');

beforeAll(async () => {
  // Use the 'mongo' service from podman-compose instead of mongodb-memory-server
  // process.env.MONGO_URI = 'mongodb://mongo:27017/test-e2e';
  
  mongodb = await MongoMemoryReplSet.create({
    binary: {
      version: '8.0.0',
      distro: 'ubuntu2204'
    },
    replSet: {
      name: 'rs0',
      count: 1,
      storageEngine: 'wiredTiger'
    }
  });
  process.env.MONGO_URI = mongodb.getUri();
  console.log('TEST MONGO_URI:', process.env.MONGO_URI);
  process.env.AUTH_JWT_SECRET = 'test-secret';
  process.env.PORT = '5001';

  // start server as a child process so we avoid importing ESM module into CJS test runner
  const env = { 
    ...process.env,
    MASTER_ENCRYPTION_KEY: process.env.MASTER_ENCRYPTION_KEY || 'test-master-key-12345678901234567890'
  };
  serverProcess = spawn('node', ['src/index.js'], { env });

  // capture output
  let started = false;
  let stdoutBuf = '';
  let stderrBuf = '';
  serverProcess.stdout.on('data', (d) => {
    const s = d.toString();
    stdoutBuf += s;
    if (s.includes('Backend running on port')) started = true;
    console.log('srv-out:', s);
  });
  serverProcess.stderr.on('data', (d) => {
    const s = d.toString();
    stderrBuf += s;
    console.error('srv-err:', s);
  });

  // wait until started (or timeout)
  const startTime = Date.now();
  while (!started && Date.now() - startTime < 10000) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!started) {
    // try a simple HTTP poll as fallback
    const startTime2 = Date.now();
    let ok = false;
    while (!ok && Date.now() - startTime2 < 10000) {
      try {
        await new Promise((r) => setTimeout(r, 200));
        await supertest('http://localhost:5001').get('/calendar/events').expect(200);
        ok = true;
      } catch (e) {
        // continue
      }
    }
    if (!ok) {
      // include server output for debugging
      throw new Error('Server failed to start. stdout:\n' + stdoutBuf + '\nstderr:\n' + stderrBuf);
    }
  }

  request = supertest('http://localhost:5001');

  // create an admin token for admin operations
  const jwt = require('jsonwebtoken');
  adminToken = jwt.sign({ sub: 'admin-test', name: 'Admin', email: 'admin@test', roles: ['admin'] }, process.env.AUTH_JWT_SECRET, { expiresIn: '14d' });
});

afterAll(async () => {
  // stop the server process
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  // stop mongodb memory server
  if (mongodb) {
    await mongodb.stop();
  }
});

describe('E2E non-regression tests', () => {
  let bobToken, bobId, bookingId, availId, aptE2EId, aptOtherId;

  test('setup test apartments', async () => {
    const res1 = await request.post('/apartments').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Apt E2E', pricePerNight: 100 }).expect(201);
    aptE2EId = res1.body._id;
    const res2 = await request.post('/apartments').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Apt Other', pricePerNight: 100 }).expect(201);
    aptOtherId = res2.body._id;
  });

  test('create guest and login returns token', async () => {
    // test traditional login (creates user if missing)
    const login = await request.post('/auth/login').send({ email: 'bob@e2e.test', name: 'Bob Tester' }).expect(200);
    expect(login.body.token).toBeTruthy();
    bobToken = login.body.token;
    bobId = login.body.user.id;

    // test magic link request/verify (test env returns token)
    const magicReq = await request.post('/auth/magic').send({ email: 'bob@e2e.test', redirectUrl: 'http://localhost:5001/magic-callback' }).expect(200);
    expect(magicReq.body.token).toBeTruthy();
    const verify = await request.post('/auth/magic/verify').send({ token: magicReq.body.token }).expect(200);
    expect(verify.body.token).toBeTruthy();
  });

  test('/auth/me returns user info with token', async () => {
    const res = await request.get('/auth/me').set('Authorization', `Bearer ${bobToken}`).expect(200);
    expect(res.body.email).toBe('bob@e2e.test');
  });

  test('create booking for apartment', async () => {
    const start = new Date(Date.now() + 24*3600*1000).toISOString();
    const end = new Date(Date.now() + 26*3600*1000).toISOString();
    const res = await request.post('/bookings').set('Authorization', `Bearer ${bobToken}`).send({ fullName: 'Bob Tester', email: 'bob@e2e.test', apartmentId: aptE2EId, start, end }).expect(201);
    expect(res.body._id).toBeTruthy();
    bookingId = res.body._id;

    // confirm event appears in calendar
    const cal = await request.get(`/calendar/events?apartmentId=${aptE2EId}`).expect(200);
    const hasBooking = cal.body.some(e => e.extendedProps?.bookingId === bookingId);
    expect(hasBooking).toBe(true);
  });

  test('overlapping booking should return 409', async () => {
    const start = new Date(Date.now() + 24*3600*1000).toISOString();
    const end = new Date(Date.now() + 26*3600*1000).toISOString();
    await request.post('/bookings').set('Authorization', `Bearer ${bobToken}`).send({ fullName: 'Bob Tester', email: 'bob@e2e.test', apartmentId: aptE2EId, start, end }).expect(409);
  });

  test('cancel booking by non-owner is forbidden', async () => {
    const create = await request.post('/customers').send({ fullName: 'Alice', email: 'alice@e2e.test' });
    const login = await request.post('/auth/login').send({ email: 'alice@e2e.test' });
    const aliceToken = login.body.token;
    await request.post(`/bookings/${bookingId}/cancel`).set('Authorization', `Bearer ${aliceToken}`).expect(403);
  });

  test('cancel booking by owner succeeds', async () => {
    const res = await request.post(`/bookings/${bookingId}/cancel`).set('Authorization', `Bearer ${bobToken}`).expect(200);
    expect(res.body.ok).toBe(true);
  });

  test('admin can create and delete availability', async () => {
    const start = new Date(Date.now() + 48*3600*1000).toISOString();
    const end = new Date(Date.now() + 52*3600*1000).toISOString();
    const res = await request.post('/availabilities').set('Authorization', `Bearer ${adminToken}`).send({ start, end, type: 'blocked', note: 'test block', apartmentId: aptE2EId }).expect(201);
    expect(res.body._id).toBeTruthy();
    availId = res.body._id;

    // delete
    const del = await request.delete(`/availabilities/${availId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(del.body.ok).toBe(true);
  });

  test('admin can create an apartment', async () => {
    // first upload a small image
    const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    // If multer not installed, the uploads endpoint accepts JSON fallback { filename, b64 }
    const up = await request.post('/uploads').set('Authorization', `Bearer ${adminToken}`).send({ filename: 'photo.png', b64: pngB64 }).expect(200);
    expect(up.body.url).toBeTruthy();

    const payload = { name: 'E2E Apartment', description: 'Test apartment', photos: [up.body.url], pricePerNight: 120, rules: 'No smoking', lat: 51.5, lon: -0.1 };
    const res = await request.post('/apartments').set('Authorization', `Bearer ${adminToken}`).send(payload).expect(201);
    expect(res.body._id).toBeTruthy();
    const list = await request.get('/apartments').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const found = list.body.some(a => a._id === res.body._id);
    expect(found).toBe(true);
  });

  test('calendar filtering returns only apartment events', async () => {
    // create a booking for other apartment
    const start = new Date(Date.now() + 72*3600*1000).toISOString();
    const end = new Date(Date.now() + 73*3600*1000).toISOString();
    const res = await request.post('/bookings').set('Authorization', `Bearer ${bobToken}`).send({ fullName: 'Bob Tester', email: 'bob@e2e.test', apartmentId: aptOtherId, start, end }).expect(201);
    const calA = await request.get(`/calendar/events?apartmentId=${aptE2EId}`).expect(200);
    const calB = await request.get(`/calendar/events?apartmentId=${aptOtherId}`).expect(200);
    const inA = calA.body.some(e => e.extendedProps?.bookingId === res.body._id);
    const inB = calB.body.some(e => e.extendedProps?.bookingId === res.body._id);
    expect(inA).toBe(false);
    expect(inB).toBe(true);
  });

  test('UCP discovery and checkout flow', async () => {
    // 1. Create a UCP-enabled apartment
    const capabilityHash = 'test-hash-123';
    const ucpApartmentPayload = {
      name: 'UCP Test Apt',
      description: 'An apartment for UCP testing',
      pricePerNight: 200,
    };

    const aptRes = await request
      .post('/apartments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(ucpApartmentPayload)
      .expect(201);
    
    const aptId = aptRes.body._id;

    // Create a UniversalCommerce record for this apartment
    const uc = await request
      .post('/ucp/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: aptId,
        capabilityHash: capabilityHash,
        baseRate: 200
      })
      .expect(201);
    
    const ucpId = uc.body._id;

    // 2. Discover the apartment via UCP
    const discoverRes = await request
      .get(`/ucp/discover?capabilityHash=${capabilityHash}`)
      .expect(200);

    expect(discoverRes.body.protocol).toBe('UCP/1.0');
    expect(discoverRes.body.results).toBeInstanceOf(Array);
    const foundItem = discoverRes.body.results.find(item => item._id === ucpId);
    expect(foundItem).toBeDefined();
    expect(foundItem.itemId._id).toBe(aptId);

    // 3. Initiate agentic checkout
    const checkoutRes = await request
      .post('/ucp/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ucpId: ucpId, paymentMandateId: 'test-mandate-456' })
      .expect(201);

    expect(checkoutRes.body.status).toBe('SUCCESS');
    expect(checkoutRes.body.message).toBe('Checkout locked for agent session');

    // 4. Verify the session is locked
    const lockedItem = await request.get(`/ucp/item/${ucpId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(lockedItem.body.checkoutSession.status).toBe('LOCKED');
    expect(lockedItem.body.checkoutSession.paymentMandateId).toBe('test-mandate-456');
  });

  test('UCP item population', async () => {
    // 1. Create a new apartment
    const apartmentName = 'UCP Population Test Apartment';
    const apartmentPayload = {
      name: apartmentName,
      description: 'Test apartment for population',
      pricePerNight: 150,
    };
    const aptRes = await request
      .post('/apartments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(apartmentPayload)
      .expect(201);
    const aptId = aptRes.body._id;

    // 2. Register the apartment for UCP
    const capabilityHash = 'population-test-hash';
    const uc = await request
      .post('/ucp/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: aptId,
        capabilityHash: capabilityHash,
        baseRate: 150,
      })
      .expect(201);
    const ucpId = uc.body._id;

    // 3. Fetch the UCP item directly
    const ucpItemRes = await request
      .get(`/ucp/item/${ucpId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 4. Verify that the itemId field is populated
    expect(ucpItemRes.body.itemId).toBeInstanceOf(Object);
    expect(ucpItemRes.body.itemId.name).toBe(apartmentName);
  });

  test('payments create-intent stub works for booking with deposit', async () => {
    // create an apartment with a fixed deposit ($75)
    const up = await request.post('/uploads').set('Authorization', `Bearer ${adminToken}`).send({ filename: 'photo.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=' }).expect(200);
    const payload = { name: 'Deposit Apt', description: 'With deposit', photos: [up.body.url], pricePerNight: 50, depositAmount: 75 };
    const aptRes = await request.post('/apartments').set('Authorization', `Bearer ${adminToken}`).send(payload).expect(201);
    const aptId = aptRes.body._id;

    // create booking for that apartment
    const start = new Date(Date.now() + 96*3600*1000).toISOString();
    const end = new Date(Date.now() + 97*3600*1000).toISOString();
    const bRes = await request.post('/bookings').set('Authorization', `Bearer ${bobToken}`).send({ fullName: 'Deposit Guest', email: 'dg@e2e.test', apartmentId: aptId, start, end }).expect(201);

    // create intent
    const pi = await request.post('/payments/create-intent').set('Authorization', `Bearer ${bobToken}`).send({ bookingId: bRes.body._id }).expect(200);
    expect(pi.body.paymentIntentId).toBeTruthy();
  });

  test('MCP SSE endpoint is accessible', async () => {
    // We use a custom fetch to verify the headers without waiting for the full response
    // since SSE is a long-lived connection.
    const res = await fetch('http://localhost:5001/mcp', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    // Important: we don't await res.text() or res.json() as it would hang.
  });
});
