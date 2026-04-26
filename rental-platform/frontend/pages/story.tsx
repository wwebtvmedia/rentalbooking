import React from 'react';
import Layout from '../components/Layout';

export default function StoryPage() {
  return (
    <Layout title="Our Story">
      <section className="py-40">
        <div className="container max-w-4xl text-center">
          <span className="text-gold font-black text-xs uppercase tracking-[0.4em] mb-6 inline-block">Established 2026</span>
          <h1 className="text-6xl font-black mb-12">The bestflats.vip Story.</h1>
          <p className="text-xl text-gray-500 leading-relaxed mb-12">
            What began as a simple idea—that finding an exceptional residence should be as inspiring as the stay itself—has evolved into a global platform for refinement. 
          </p>
          <div className="prose prose-luxury mx-auto text-left text-gray-500">
            <p className="mb-6">Founded in Suresnes, we have grown from a local collection to a worldwide network of property owners and discerning guests.</p>
            <p className="mb-6">Our commitment to excellence is reflected in every detail, from the selection of our residences to our specialized concierge services.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
