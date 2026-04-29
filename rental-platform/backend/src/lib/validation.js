import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({ body: req.body, query: req.query, params: req.params });
    next();
  } catch (err) {
    const details = err.errors ? err.errors.map(e => ({ path: e.path.join('.'), message: e.message })) : err.message;
    return res.status(400).json({ error: 'Validation failed', details });
  }
};

export const customerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
  }),
});

export const bookingSchema = z.object({
  body: z.object({
    start: z.string(),
    end: z.string(),
    apartmentId: z.string().optional(),
  }).passthrough(),
});

export const apartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    smallDescription: z.string().optional(),
    address: z.string().optional(),
    photos: z.union([z.array(z.string()), z.string()]).optional(),
    pricePerNight: z.coerce.number().nonnegative().optional(),
    rules: z.string().optional(),
    lat: z.coerce.number().optional(),
    lon: z.coerce.number().optional(),
    depositAmount: z.coerce.number().nonnegative().optional(),
    ethAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().or(z.literal('')),
    hostId: z.string().optional(),
    assignedConciergeId: z.string().optional(),
  }).passthrough(),
});
