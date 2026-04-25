import React from 'react';
import Layout from '../components/Layout';

export default function ConciergePage() {
  return (
    <Layout title="Concierge Services | bestflats.vip">
      <section className="py-40 bg-black text-white min-h-[80vh] flex items-center">
        <div className="container">
          <div className="max-w-4xl">
            <span className="text-gold font-black text-xs uppercase tracking-[0.4em] mb-6 inline-block">Bespoke Hospitality</span>
            <h1 className="text-6xl font-black mb-12">At your <br/> service.</h1>
            <p className="text-xl text-gray-400 leading-relaxed mb-16">
              From private jet charters and gourmet dining to personalized itinerary planning, our dedicated concierge team ensures your stay is seamless and extraordinary.
            </p>
            <button className="btn btn-gold px-12">Contact Concierge</button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
