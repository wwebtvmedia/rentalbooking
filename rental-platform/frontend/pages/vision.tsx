import React from 'react';
import Layout from '../components/Layout';

export default function VisionPage() {
  return (
    <Layout title="Our Vision | bestflats.vip">
      <section className="py-40">
        <div className="container max-w-4xl text-center">
          <h1 className="text-5xl font-black mb-12">The Future <br/> of Living.</h1>
          <p className="text-xl text-gray-500 leading-relaxed mb-12">
            We believe that where you live should be as inspiring as how you live. Our vision is to merge technology, architecture, and hospitality into a singular, seamless experience.
          </p>
          <div className="aspect-video bg-gray-100 rounded-3xl mb-12 flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest text-xs">
            A New Standard in Refinement
          </div>
        </div>
      </section>
    </Layout>
  );
}
