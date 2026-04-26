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
    pricePerNight: 285,
    photos: [
      '/uploads/appartement/salon.avif',
      '/uploads/appartement/chambre.avif',
      '/uploads/appartement/cuisine.avif',
      '/uploads/appartement/douche.avif',
    ],
    rules: 'No smoking, no parties, respect the neighbors.',
    depositAmount: 50000,
  },
];

export function findFallbackApartment(id?: string | string[]) {
  const normalizedId = Array.isArray(id) ? id[0] : id;
  return FALLBACK_APARTMENTS.find((apartment) => apartment.id === normalizedId || apartment._id === normalizedId) || FALLBACK_APARTMENTS[0];
}
