export const FALLBACK_APARTMENTS = [
  {
    id: 'suresnes-modern-stay',
    _id: 'suresnes-modern-stay',
    name: 'Comfortable and Convenient Stay in the Heart of Suresnes',
    lat: 48.87297687408006,
    lon: 2.2262012958526616,
    address: "Rue Honore d'Estienne d'Orves, Suresnes, 92150, France",
    description: `Located in the charming town of Suresnes, just outside Paris, this modern one-bedroom apartment offers a cozy living space with a comfortable lounge, fully equipped kitchen, and in-unit washing machine.
Enjoy free Wi-Fi and a private bathroom everything you need for a relaxing stay.
Prime Location Near Paris the apartment is ideally located close to top Parisian landmarks, including the Palais des Congres (6 km), and Eiffel Tower (7 km).`,
    smallDescription: 'Modern one-bedroom apartment just outside Paris',
    pricePerNight: 160,
    photos: [
      '/uploads/appartement/salon.avif',
      '/uploads/appartement/chambre.avif',
      '/uploads/appartement/cuisine.avif',
      '/uploads/appartement/douche.avif',
    ],
    rules: 'No smoking, no parties, no pets. Respect the neighbors.',
    depositAmount: 50000,
  },
  {
    id: 'nabel-bungalow',
    _id: 'nabel-bungalow',
    name: 'Club Farah Nabeul Bungalow',
    lat: 36.4448,
    lon: 10.7365,
    address: 'Club Farah, Nabeul 8000, Tunisia',
    description: `Discover the vibrant beauty of Nabeul at the Club Farah Bungalow. Located steps from the Mediterranean and just a short walk from the Nabeul City Hall, this residence offers a perfect blend of culture and relaxation.
The bungalow features traditional Tunisian architecture with modern luxury finishes, a private garden, and direct beach access.
Experience the famous Nabeul markets and craftsmanship while staying in the city's most exclusive beach club area.`,
    smallDescription: 'Beachside luxury in the heart of Tunisia',
    pricePerNight: 90,
    photos: [
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
    ],
    rules: 'No smoking, no parties, no pets. Respect the neighbors.',
    depositAmount: 80000,
  },
  {
    id: 'antibes-flat',
    _id: 'antibes-flat',
    name: 'Azure Antibes Flat',
    lat: 43.5804,
    lon: 7.1251,
    address: 'Old Town, 06600 Antibes, France',
    description: `A sophisticated residence located in the historic center of Antibes. This flat combines classic French architecture with contemporary luxury.
Featuring views of the Mediterranean and the Port Vauban, the apartment offers a spacious living room, a marble bathroom, and high-speed fiber internet.
Enjoy the best of the Côte d'Azur, with the Picasso Museum and pristine beaches just a short walk away.`,
    smallDescription: 'Classic elegance in the heart of the French Riviera',
    pricePerNight: 180,
    photos: [
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687940-4e2a09695d51?auto=format&fit=crop&w=1200&q=80'
    ],
    rules: 'Strictly no pets. No parties. Respect the historical building.',
    depositAmount: 50000,
  }
];

export function findFallbackApartment(id?: string | string[]) {
  const normalizedId = Array.isArray(id) ? id[0] : id;
  return FALLBACK_APARTMENTS.find((apartment) => apartment.id === normalizedId || apartment._id === normalizedId) || FALLBACK_APARTMENTS[0];
}
