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
    name: 'The Crown Penthouse at Hudson Yards',
    smallDescription: 'Unrivaled panoramic views of Manhattan',
    description: `Experience the pinnacle of New York luxury in this spectacular penthouse. Featuring floor-to-ceiling windows, a private wraparound terrace, and curated contemporary art.
The residence offers a state-of-the-art chef's kitchen, smart home integration, and a master suite that defies expectations.
Located in the heart of Hudson Yards, you are steps away from world-class dining, high-end shopping, and the High Line.`,
    address: 'Hudson Yards, New York, NY 10001, USA',
    pricePerNight: 1250,
    lat: 40.7533,
    lon: -74.0016,
    photos: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687940-4e2a09695d51?auto=format&fit=crop&w=1200&q=80'
    ],
    rules: 'No events or commercial photography without prior approval.',
    depositAmount: 250000 
  },
  {
    name: 'Villa Aetheria',
    smallDescription: 'Secluded cliffside villa with infinity pool',
    description: `A masterclass in Cycladic architecture, Villa Aetheria offers a secluded sanctuary perched on the cliffs of Oia. 
Immerse yourself in the heated infinity pool that merges seamlessly with the Aegean Sea. The villa features minimalist luxury interiors, a private wine cellar, and a dedicated butler.
Enjoy the legendary Santorini sunsets from your private terrace in absolute privacy.`,
    address: 'Oia, Santorini 847 02, Greece',
    pricePerNight: 890,
    lat: 36.4618,
    lon: 25.3753,
    photos: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1613490900233-04144177d617?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80'
    ],
    rules: 'Adults only. No pets allowed.',
    depositAmount: 100000 
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
