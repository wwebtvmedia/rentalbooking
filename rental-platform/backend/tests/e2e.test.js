const supertest = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

let mongod;
let app;
let request;
let adminToken;

const { spawn } = require('child_process');

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.AUTH_JWT_SECRET = 'test-secret';
  process.env.PORT = '5001';

  // start server as a child process so we avoid importing ESM module into CJS test runner
  const env = { ...process.env };
  serverProcess = spawn('node', ['src/index.js'], { env });

  // capture output
  let started = false;
  let stdoutBuf = '';
  let stderrBuf = '';
  serverProcess.stdout.on('data', (d) => {
    const s = d.toString();
    stdoutBuf += s;
    if (s.includes('Backend running on port')) started = true;
    // console.log('srv:', s);
  });
  serverProcess.stderr.on('data', (d) => {
    const s = d.toString();
    stderrBuf += s;
    // console.error('srv-err:', s);
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
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('E2E non-regression tests', () => {
  let bobToken, bobId, bookingId, availId;

  test('create guest and login returns token', async () => {
    const create = await request.post('/customers').send({ fullName: 'Bob Tester', email: 'bob@e2e.test' });
    expect([200,201]).toContain(create.status);
    bobId = create.body._id;

    // test traditional login
    const login = await request.post('/auth/login').send({ email: 'bob@e2e.test' }).expect(200);
    expect(login.body.token).toBeTruthy();
    bobToken = login.body.token;

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
    const res = await request.post('/bookings').set('Authorization', `Bearer ${bobToken}`).send({ fullName: 'Bob Tester', email: 'bob@e2e.test', apartmentId: 'apt-e2e', start, end }).expect(201);
    expect(res.body._id).toBeTruthy();
    bookingId = res.body._id;

    // confirm event appears in calendar
    const cal = await request.get(`/calendar/events?apartmentId=apt-e2e`).expect(200);
    const hasBooking = cal.body.some(e => e.extendedProps?.bookingId === bookingId);
    expect(hasBooking).toBe(true);
  });

  test('overlapping booking should return 409', async () => {
    const start = new Date(Date.now() + 24*3600*1000).toISOString();
    const end = new Date(Date.now() + 26*3600*1000).toISOString();
    await request.post('/bookings').set('Authorization', `Bearer ${bobToken}`).send({ fullName: 'Bob Tester', email: 'bob@e2e.test', apartmentId: 'apt-e2e', start, end }).expect(409);
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
    const res = await request.post('/availabilities').set('Authorization', `Bearer ${adminToken}`).send({ start, end, type: 'blocked', note: 'test block', apartmentId: 'apt-e2e' }).expect(201);
    expect(res.body._id).toBeTruthy();
    availId = res.body._id;

    // delete
    const del = await request.delete(`/availabilities/${availId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(del.body.ok).toBe(true);
  });

  test('calendar filtering returns only apartment events', async () => {
    // create a booking for other apartment
    const start = new Date(Date.now() + 72*3600*1000).toISOString();
    const end = new Date(Date.now() + 73*3600*1000).toISOString();
    const res = await request.post('/bookings').set('Authorization', `Bearer ${bobToken}`).send({ fullName: 'Bob Tester', email: 'bob@e2e.test', apartmentId: 'apt-other', start, end }).expect(201);
    const calA = await request.get('/calendar/events?apartmentId=apt-e2e').expect(200);
    const calB = await request.get('/calendar/events?apartmentId=apt-other').expect(200);
    const inA = calA.body.some(e => e.extendedProps?.bookingId === res.body._id);
    const inB = calB.body.some(e => e.extendedProps?.bookingId === res.body._id);
    expect(inA).toBe(false);
    expect(inB).toBe(true);
  });
});
