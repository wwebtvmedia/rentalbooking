import express from 'express';
import Apartment from '../models/Apartment.js';
import { logger } from '../logger.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const count = await Apartment.countDocuments();
    if (count > 0 && !req.query.force) {
      return res.json({ message: 'Database already has apartments. Use ?force=true to seed anyway.' });
    }

    const apartments = [
      {
        name: 'The Skyline Loft: Panoramic Views & Luxury Living near Paris',
        smallDescription: 'Luxury Designer Loft with Eiffel Tower Views',
        description: 'Perched on the hills of Suresnes, this designer loft combines industrial chic with warm, modern luxury. Experience breathtaking views of the Eiffel Tower from your private terrace, unwind in the spa-inspired rain shower, and enjoy a seamless stay with high-end appliances and curated art throughout.',
        address: 'Suresnes Heights, overlooking Paris skyline',
        pricePerNight: 285,
        lat: 48.87297687408006,
        lon: 2.2262012958526616,
        photos: [
          '/uploads/appartement/salon.avif',
          '/uploads/appartement/chambre.avif',
          '/uploads/appartement/cuisine.avif',
          '/uploads/appartement/douche.avif'
        ],
        rules: 'No smoking, no parties.',
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
