import express from 'express';
import * as ucpController from '../controllers/ucpController.js';
import { requireRole, authMiddleware } from '../auth/index.js';

const router = express.Router();
router.use(authMiddleware);


// UCP Standard: Discovery endpoint for AI agents
router.get('/discover', ucpController.discoverInventory);

// UCP Standard: Agentic checkout initiation
router.post('/checkout', requireRole('admin'), ucpController.initiateAgenticCheckout);

// Register an item for UCP
router.post('/register', requireRole('admin'), ucpController.registerItem);

// Get UCP item details
router.get('/item/:id', ucpController.getItem);

export default router;