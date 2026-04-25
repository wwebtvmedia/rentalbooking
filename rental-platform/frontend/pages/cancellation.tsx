import React from 'react';
import Layout from '../components/Layout';

export default function CancellationPage() {
  return (
    <Layout title="Cancellation Policies | dreamflat">
      <section className="py-40">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-black mb-12">Flexible Stays.</h1>
          <div className="space-y-12">
            <div>
              <h3 className="font-bold mb-4 uppercase tracking-widest text-gold text-xs">Standard Policy</h3>
              <p className="text-gray-500">Free cancellation up to 7 days before check-in. Deposits are refunded instantly.</p>
            </div>
            <div>
              <h3 className="font-bold mb-4 uppercase tracking-widest text-gold text-xs">Long-term Policy</h3>
              <p className="text-gray-500">Stays over 28 nights require 30 days notice for modification or cancellation.</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
