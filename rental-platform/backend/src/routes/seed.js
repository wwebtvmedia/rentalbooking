import express from 'express';
import fs from 'fs';
import path from 'path';
import Apartment from '../models/Apartment.js';
import Media from '../models/Media.js';
import UniversalCommerce from '../models/UniversalCommerce.js';
import { logger } from '../logger.js';
import { requireRole, authMiddleware } from '../auth/index.js';

const router = express.Router();

const apartments = [
  {
    name: 'Comfortable and Convenient Stay in the Heart of Suresnes',
    slug: 'suresnes-modern-stay',
    smallDescription: 'Modern one-bedroom apartment just outside Paris',
    description: `Located in the charming town of Suresnes, just outside Paris, this modern one-bedroom apartment offers a cozy living space with a comfortable lounge, fully equipped kitchen, and in-unit washing machine.
Enjoy free Wi-Fi and a private bathroom everything you need for a relaxing stay.
Prime Location Near Paris the apartment is ideally located close to top Parisian landmarks, including the Palais des Congrès (6 km), and Eiffel Tower (7 km).`,
    address: 'Rue Honoré d\'Estienne d\'Orves, Suresnes, 92150, France',
    pricePerNight: 160,
    lat: 48.87297687408006,
    lon: 2.2262012958526616,
    photos: [
      '/uploads/salon.avif',
      '/uploads/chambre.avif',
      '/uploads/cuisine.avif',
      '/uploads/douche.avif'
    ],
    rules: 'No smoking, no parties, no pets. Respect the neighbors.',
    depositAmount: 50000 
  }
];

router.use(authMiddleware);

// Utility to seed media files from the filesystem to MongoDB
async function seedMedia() {
    const uploadDir = path.join(process.cwd(), 'uploads/appartement');
    if (!fs.existsSync(uploadDir)) {
        logger.warn('Seed: uploads/appartement directory not found, skipping media seed.');
        return;
    }

    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
        if (file.endsWith('.avif')) {
            const filePath = path.join(uploadDir, file);
            const data = fs.readFileSync(filePath);
            // Store as plain filename in DB, served via /uploads/:filename
            await Media.findOneAndUpdate(
                { filename: file },
                { 
                    filename: file, 
                    contentType: 'image/avif', 
                    data: data 
                },
                { upsert: true }
            );
            logger.info({ file }, 'Seed: Imported media to database');
        }
    }
}

async function runSeed(force = false) {
  await seedMedia();
  if (force) {
    await Apartment.deleteMany({});
    await UniversalCommerce.deleteMany({});
    logger.info('Cleared existing inventory due to force=true');
  } else {
    const count = await Apartment.countDocuments();
    if (count > 0) return { message: 'Database already has apartments.', skip: true };
  }

  const created = await Apartment.insertMany(apartments);
  
  // Register each apartment for UCP
  const ucpRecords = created.map(apt => ({
    itemId: apt._id,
    ucpMetadata: {
      capabilityHash: 'rental-listing-v1',
      isAgenticEnabled: true,
    },
    dynamicPricing: {
      baseRate: apt.pricePerNight,
      currency: 'USDC',
    }
  }));
  await UniversalCommerce.insertMany(ucpRecords);

  logger.info('Database seeded with sample apartments and UCP records');
  return { message: 'Seeded successfully', count: created.length };
}

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await runSeed(req.query.force === 'true');
    if (result.skip) return res.json(result);
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Seeding failed');
    res.status(500).json({ error: err.message });
  }
});

// Protected seed endpoint for deployment scripts
router.get('/unprotected', async (req, res) => {
  const expectedKey = process.env.PLATFORM_ADMIN_KEY;
  if (!expectedKey) return res.status(403).json({ error: 'PLATFORM_ADMIN_KEY is not configured' });

  const adminKey = req.headers['x-platform-admin-key'];
  if (!adminKey || adminKey !== expectedKey) {
      return res.status(403).json({ error: 'Invalid Platform Admin Key' });
  }

  try {
    const result = await runSeed(req.query.force === 'true');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
