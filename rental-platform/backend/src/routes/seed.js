import express from 'express';
import fs from 'fs';
import path from 'path';
import Apartment from '../models/Apartment.js';
import Media from '../models/Media.js';
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
  },
  {
    name: 'Club Farah Nabeul Bungalow',
    slug: 'nabeul-beach-bungalow',
    smallDescription: 'Beachside luxury in the heart of Tunisia',
    description: `Discover the vibrant beauty of Nabeul at the Club Farah Bungalow. Located steps from the Mediterranean and just a short walk from the Nabeul City Hall, this residence offers a perfect blend of culture and relaxation.
The bungalow features traditional Tunisian architecture with modern luxury finishes, a private garden, and direct beach access.
Experience the famous Nabeul markets and craftsmanship while staying in the city's most exclusive beach club area.`,
    address: 'Club Farah, Nabeul 8000, Tunisia',
    pricePerNight: 90,
    lat: 36.4448,
    lon: 10.7365,
    photos: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
    ],
    rules: 'No smoking, no parties, no pets. Respect the neighbors.',
    depositAmount: 80000 
  },
  {
    name: 'Azure Antibes Flat',
    slug: 'antibes-azure-flat',
    smallDescription: 'Classic elegance in the heart of the French Riviera',
    description: `A sophisticated residence located in the historic center of Antibes. This flat combines classic French architecture with contemporary luxury.
Featuring views of the Mediterranean and the Port Vauban, the apartment offers a spacious living room, a marble bathroom, and high-speed fiber internet.
Enjoy the best of the Côte d'Azur, with the Picasso Museum and pristine beaches just a short walk away.`,
    address: 'Old Town, 06600 Antibes, France',
    pricePerNight: 180,
    lat: 43.5804,
    lon: 7.1251,
    photos: [
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687940-4e2a09695d51?auto=format&fit=crop&w=1200&q=80'
    ],
    rules: 'Strictly no pets. No parties. Respect the historical building.',
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

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    await seedMedia();
    if (req.query.force === 'true') {
      await Apartment.deleteMany({});
      logger.info('Cleared existing apartments due to force=true');
    } else {
      const count = await Apartment.countDocuments();
      if (count > 0) {
        return res.json({ message: 'Database already has apartments. Use ?force=true to seed anyway.' });
      }
    }

    await Apartment.insertMany(apartments);
    logger.info('Database seeded with sample apartments');
    res.json({ message: 'Seeded successfully', count: apartments.length });
  } catch (err) {
    logger.error({ err }, 'Seeding failed');
    res.status(500).json({ error: err.message });
  }
});

// Unprotected seed endpoint for deployment scripts
router.get('/unprotected', async (req, res) => {
  // Bypasses authMiddleware check
  try {
    await seedMedia();
    const count = await Apartment.countDocuments();
    if (count > 0 && req.query.force !== 'true') {
      return res.json({ message: 'Database already has apartments.' });
    }
    if (req.query.force === 'true') await Apartment.deleteMany({});

    await Apartment.insertMany(apartments);
    res.json({ message: 'Seeded successfully', count: apartments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
