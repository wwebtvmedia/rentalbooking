import express from 'express';
import Apartment from '../models/Apartment.js';
import { logger } from '../logger.js';
import { requireRole, authMiddleware } from '../auth/index.js';

const router = express.Router();
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
        depositAmount: 50000 // $500 in cents
      }
    ];

    await Apartment.insertMany(apartments);
    logger.info('Database seeded with sample apartments');
    res.json({ message: 'Seeded successfully', count: apartments.length });
  } catch (err) {
    logger.error({ err }, 'Seeding failed');
    res.status(500).json({ error: err.message });
  }
});

export default router;
