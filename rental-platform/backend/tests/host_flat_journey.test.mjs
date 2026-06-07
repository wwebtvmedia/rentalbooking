import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

// Full journey: a new host submits a flat -> it is pending + hidden from the public
// list -> an admin publishes it via the emailed (signed) validation link -> another
// new user (guest) discovers and books it -> the booking is recorded and the
// double-booking guard holds. Bookings use transactions, hence MongoMemoryReplSet.
let mongodb;
let request;
let app;
const SECRET = 'journey-secret';

describe('Host flat submission → admin validation → guest booking', () => {
  beforeAll(async () => {
    mongodb = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGO_URI = mongodb.getUri();
    process.env.AUTH_JWT_SECRET = SECRET;
    process.env.MASTER_ENCRYPTION_KEY = 'journey-master-key-1234567890123456';
    process.env.NODE_ENV = 'test';
    const serverFile = await import('../src/index.js');
    app = serverFile.default;
    request = supertest(app);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongodb.stop();
  });

  const login = async (email, role) => {
    const m = await request.post('/auth/magic').send({ email, role });
    const v = await request.post('/auth/magic/verify').send({ token: m.body.token });
    return v.body.token;
  };

  let hostToken;
  let guestToken;
  let flatId;
  let bookingId;

  it('a new host submits a flat (Bardo, Tunisia) — created pending and hidden from the public list', async () => {
    hostToken = await login('amira.host@example.tn', 'host');

    const submit = await request
      .post('/admin/host/flats')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        name: 'Le Bardo Residence',
        description: 'Bright apartment a short walk from the Bardo National Museum, Tunis.',
        address: 'Le Bardo, Tunis, Tunisia',
        lat: 36.8092,
        lon: 10.1406,
        pricePerNight: 90,
        depositAmount: 200,
        // Open-usage placeholder images (Lorem Picsum — free, no attribution).
        photos: [
          'https://picsum.photos/seed/bardo-1/1200/800',
          'https://picsum.photos/seed/bardo-2/1200/800',
          'https://picsum.photos/seed/bardo-3/1200/800',
        ],
      });

    expect(submit.status).toBe(201);
    expect(submit.body.status).toBe('pending');
    expect(submit.body.flat.photos).toHaveLength(3);
    flatId = submit.body.flat._id;

    const publicList = await request.get('/apartments');
    expect(publicList.body.some((a) => a.name === 'Le Bardo Residence')).toBe(false);

    const hostList = await request.get('/admin/host/flats').set('Authorization', `Bearer ${hostToken}`);
    expect(hostList.body.find((f) => f._id === flatId)?.status).toBe('pending');
  });

  it('an admin publishes it via the signed validation link, making it public', async () => {
    const validationToken = jwt.sign({ flatId, purpose: 'flat-validation' }, SECRET, { expiresIn: '7d' });
    const val = await request.get('/admin/host/flats/validate').query({ token: validationToken });

    expect(val.status).toBe(200);
    expect(val.text).toMatch(/Published/i);

    const publicList = await request.get('/apartments');
    expect(publicList.body.some((a) => a.name === 'Le Bardo Residence')).toBe(true);
  });

  it('another new user (guest) discovers the published flat and books it', async () => {
    guestToken = await login('karim.guest@example.com', 'guest');

    // The guest can only discover published flats via the public list.
    const discover = await request.get('/apartments');
    const target = discover.body.find((a) => a.name === 'Le Bardo Residence');
    expect(target).toBeTruthy();

    const booking = await request
      .post('/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ apartmentId: target._id, start: '2026-08-10', end: '2026-08-14' });

    expect(booking.status).toBe(201);
    bookingId = booking.body._id;
  });

  it('records the booking and rejects an overlapping re-book', async () => {
    const myBookings = await request.get('/bookings').set('Authorization', `Bearer ${guestToken}`);
    expect(myBookings.body.some((b) => b._id === bookingId)).toBe(true);

    const overlap = await request
      .post('/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ apartmentId: flatId, start: '2026-08-11', end: '2026-08-13' });

    expect(overlap.status).toBe(409);
  });
});
