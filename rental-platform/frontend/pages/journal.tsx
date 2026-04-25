import React from 'react';
import Layout from '../components/Layout';

export default function JournalPage() {
  return (
    <Layout title="The Journal | bestflats.vip">
      <section className="py-40">
        <div className="container">
          <h1 className="text-4xl font-black mb-16 uppercase tracking-[0.2em] text-center">Journal.</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <div className="group cursor-pointer">
              <div className="aspect-square bg-gray-100 rounded-3xl mb-8 overflow-hidden">
                <div className="w-full h-full group-hover:scale-110 transition-transform duration-700 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80')] bg-cover"></div>
              </div>
              <h3 className="text-xl font-bold mb-2">Modernism in Kyoto</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Architecture</p>
            </div>
            <div className="group cursor-pointer">
              <div className="aspect-square bg-gray-100 rounded-3xl mb-8 overflow-hidden">
                <div className="w-full h-full group-hover:scale-110 transition-transform duration-700 bg-[url('https://images.unsplash.com/photo-1600607687940-4e2a09695d51?auto=format&fit=crop&w=800&q=80')] bg-cover"></div>
              </div>
              <h3 className="text-xl font-bold mb-2">The Art of the Stay</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hospitality</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
