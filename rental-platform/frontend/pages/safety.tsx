import React from 'react';
import Layout from '../components/Layout';

export default function SafetyPage() {
  return (
    <Layout title="Safety Guidelines | dreamflat">
      <section className="py-40">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-black mb-12">Safety First.</h1>
          <p className="text-xl text-gray-500 mb-12 leading-relaxed">
            Your safety and well-being are our top priority. We implement rigorous standards across all our properties.
          </p>
          <div className="space-y-12">
            <div className="p-10 bg-gray-50 rounded-3xl">
              <h3 className="font-bold mb-4 uppercase tracking-widest text-gold text-xs">Vetted Properties</h3>
              <p className="text-gray-600">Every residence undergoes a thorough 100-point inspection before being listed.</p>
            </div>
            <div className="p-10 bg-gray-50 rounded-3xl">
              <h3 className="font-bold mb-4 uppercase tracking-widest text-gold text-xs">Guest Screening</h3>
              <p className="text-gray-600">We verify all guests to ensure a secure environment for our community.</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
