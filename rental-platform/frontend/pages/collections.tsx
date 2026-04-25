import React from 'react';
import Layout from '../components/Layout';

export default function CollectionsPage() {
  return (
    <Layout title="Our Collection | dreamflat">
      <section className="py-40">
        <div className="container">
          <div className="max-w-4xl">
            <span className="text-gold font-black text-xs uppercase tracking-[0.4em] mb-6 inline-block">Curated Inventory</span>
            <h1 className="text-6xl font-black mb-12">The Collection.</h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-16">
              A bespoke selection of properties that redefine luxury living. Each residence is chosen for its architectural significance, prime location, and unparalleled amenities.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="aspect-[4/5] bg-gray-100 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-gray-400">Preview: Penthouses</div>
              <div className="aspect-[4/5] bg-gray-100 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-gray-400">Preview: Villas</div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
