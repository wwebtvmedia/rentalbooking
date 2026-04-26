import React from 'react';
import Layout from '../components/Layout';

export default function PrivacyPage() {
  return (
    <Layout title="Privacy Policy">
      <section className="py-40">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-black mb-12">Privacy Policy.</h1>
          <div className="prose prose-luxury">
            <p className="mb-6">Effective Date: April 25, 2026</p>
            <p className="mb-6">At bestflats.vip, we respect your privacy. This policy outlines how we collect, use, and protect your personal information.</p>
            <h3 className="text-xl font-bold mb-4 mt-8 uppercase tracking-widest text-gold">1. Information Collection</h3>
            <p className="mb-6 text-gray-500">We collect information provided during booking and account creation, including name, email, and payment details.</p>
            <h3 className="text-xl font-bold mb-4 mt-8 uppercase tracking-widest text-gold">2. Crypto Payments</h3>
            <p className="mb-6 text-gray-500">Transaction hashes for USDC payments are stored to verify deposits and maintain accounting records.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
