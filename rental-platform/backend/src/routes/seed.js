import express from 'express';
import Apartment from '../models/Apartment.js';
import { logger } from '../logger.js';
import { requireRole, authMiddleware } from '../auth/index.js';

const router = express.Router();

const apartments = [
  {
    name: 'Comfortable and Convenient Stay in the Heart of Suresnes',
    smallDescription: 'Modern one-bedroom apartment just outside Paris',
    description: `Located in the charming town of Suresnes, just outside Paris, this modern one-bedroom apartment offers a cozy living space with a comfortable lounge, fully equipped kitchen, and in-unit washing machine.
Enjoy free Wi-Fi and a private bathroom everything you need for a relaxing stay.
Prime Location Near Paris the apartment is ideally located close to top Parisian landmarks, including the Palais des Congrès (6 km), and Eiffel Tower (7 km).`,
    address: 'Rue Honoré d\'Estienne d\'Orves, Suresnes, 92150, France',
    pricePerNight: 285,
    lat: 48.87297687408006,
    lon: 2.2262012958526616,
    photos: [
      '/uploads/appartement/salon.avif',
      '/uploads/appartement/chambre.avif',
      '/uploads/appartement/cuisine.avif',
      '/uploads/appartement/douche.avif'
    ],
    rules: 'No smoking, no parties, respect the neighbors.',
    depositAmount: 50000 
  },
  {
    name: 'Nabel Bungalow by the Sea',
    smallDescription: 'Bohemian luxury just steps from the sand',
    description: `Experience the ultimate coastal retreat in the Nabel Bungalow. This eco-conscious residence features open-air living spaces, a private beach path, and artisanal decor.
Wake up to the sound of the waves and enjoy breakfast on your sun-drenched deck. The bungalow offers total privacy and a minimalist design that connects you with nature.
Perfect for couples or solo travelers seeking a peaceful escape with modern amenities.`,
    address: 'Plage de Nabel, 83120 Sainte-Maxime, France',
    pricePerNight: 420,
    lat: 43.3082,
    lon: 6.6372,
    photos: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
    ],
    rules: 'No loud music after sunset. Respect the beach environment.',
    depositAmount: 80000 
  },
  {
    name: 'Azure Antibes Flat',
    smallDescription: 'Classic elegance in the heart of the French Riviera',
    description: `A sophisticated residence located in the historic center of Antibes. This flat combines classic French architecture with contemporary luxury.
Featuring views of the Mediterranean and the Port Vauban, the apartment offers a spacious living room, a marble bathroom, and high-speed fiber internet.
Enjoy the best of the Côte d'Azur, with the Picasso Museum and pristine beaches just a short walk away.`,
    address: 'Old Town, 06600 Antibes, France',
    pricePerNight: 350,
    lat: 43.5804,
    lon: 7.1251,
    photos: [
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687940-4e2a09695d51?auto=format&fit=crop&w=1200&q=80'
    ],
    rules: 'Small pets allowed. No parties.',
    depositAmount: 50000 
  }
];

router.use(authMiddleware);

router.post('/', requireRole('admin'), async (req, res) => {
  try {
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
