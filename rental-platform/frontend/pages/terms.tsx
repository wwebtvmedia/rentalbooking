import React from 'react';
import Layout from '../components/Layout';

export default function TermsPage() {
  return (
    <Layout title="Terms of Service">
      <section className="py-40">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-black mb-12">Terms of Service.</h1>
          <div className="prose prose-luxury">
            <p className="mb-6">By using our platform, you agree to these terms.</p>
            <h3 className="text-xl font-bold mb-4 mt-8 uppercase tracking-widest text-gold">1. Bookings</h3>
            <p className="mb-6 text-gray-500">All bookings are subject to availability and confirmation. A guarantee deposit may be required.</p>
            <h3 className="text-xl font-bold mb-4 mt-8 uppercase tracking-widest text-gold">2. Cancellations</h3>
            <p className="mb-6 text-gray-500">Cancellations must be made according to our policy. Refunds are processed via the original payment method.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
