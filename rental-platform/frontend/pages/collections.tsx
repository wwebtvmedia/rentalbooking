import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { assetUrl } from '../lib/config';
import { fetchApartments } from '../lib/apartments';

export default function CollectionsPage() {
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApartments = async () => {
      setApartments(await fetchApartments());
      setLoading(false);
    };
    loadApartments();
  }, []);

  return (
    <Layout title="Our Collection">
      <section className="py-40">
        <div className="container">
          <div className="max-w-4xl mb-20">
            <span className="text-gold font-black text-xs uppercase tracking-[0.4em] mb-6 inline-block">Curated Inventory</span>
            <h1 className="text-6xl font-black mb-12">The Collection.</h1>
            <p className="text-xl text-gray-500 leading-relaxed">
              A bespoke selection of properties that redefine luxury living. Each residence is chosen for its architectural significance, prime location, and reliable guest experience.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {[1, 2, 3].map((i) => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {apartments.map((apt) => (
                <Link href={`/apartment?id=${apt._id || apt.id}`} key={apt._id || apt.id} className="group cursor-pointer">
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-gray-100 mb-6 shadow-sm">
                    <img src={assetUrl(apt.photos?.[0])} alt={apt.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  </div>
                  <div className="flex justify-between gap-6 items-start">
                    <div>
                      <h2 className="text-xl font-black mb-2 group-hover:text-gold transition-colors">{apt.name}</h2>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{apt.smallDescription || apt.address || 'Verified residence'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black">${apt.pricePerNight || 0}</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">night</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
