import express from 'express';
import { validate, customerSchema } from '../lib/validation.js';
import { findOrCreateUser } from '../auth/users.js';
import { logger } from '../logger.js';

const router = express.Router();

router.post('/', validate(customerSchema), async (req, res) => {
  const forensicId = Math.random().toString(36).substring(7);
  try {
    const { fullName, email } = req.body;
    const result = await findOrCreateUser({ fullName, email, role: 'guest' });
    logger.info({ forensicId, userId: result.user._id }, 'CUSTOMER_CREATE: guest customer available');
    res.status(201).json(result.public);
  } catch (err) {
    logger.error({ forensicId, err: err.message }, 'CUSTOMER_CREATE: failed');
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
