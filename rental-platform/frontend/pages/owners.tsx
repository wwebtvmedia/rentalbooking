import React from 'react';
import Layout from '../components/Layout';

export default function OwnersPage() {
  return (
    <Layout title="For Property Owners | bestflats.vip">
      <section className="py-40">
        <div className="container">
          <div className="max-w-4xl">
            <span className="text-gold font-black text-xs uppercase tracking-[0.4em] mb-6 inline-block">Partnership</span>
            <h1 className="text-6xl font-black mb-12">List your property.</h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-16">
              Join an elite circle of property owners. We provide comprehensive management services, including marketing, maintenance, and guest screening, to maximize your asset's potential.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="p-8 border border-gray-100 rounded-2xl">
                <h3 className="font-bold mb-4">Elite Marketing</h3>
                <p className="text-sm text-gray-400">Global reach to discerning travelers.</p>
              </div>
              <div className="p-8 border border-gray-100 rounded-2xl">
                <h3 className="font-bold mb-4">Full Management</h3>
                <p className="text-sm text-gray-400">24/7 maintenance and support.</p>
              </div>
              <div className="p-8 border border-gray-100 rounded-2xl">
                <h3 className="font-bold mb-4">Secured Payments</h3>
                <p className="text-sm text-gray-400">Instant deposits via USDC & Stripe.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
