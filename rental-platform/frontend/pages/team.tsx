import React from 'react';
import Layout from '../components/Layout';

export default function TeamPage() {
  return (
    <Layout title="Join the Team">
      <section className="py-40">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-black mb-12">Build the <br/> Exceptional.</h1>
          <p className="text-xl text-gray-500 mb-16 leading-relaxed">
            We are always looking for visionary designers, engineers, and hospitality experts to join our global team.
          </p>
          <div className="space-y-6">
            <div className="p-8 border border-gray-100 rounded-2xl flex justify-between items-center group hover:bg-black hover:text-white transition-all cursor-pointer">
              <span className="font-bold">Lead Product Designer</span>
              <span className="text-[10px] uppercase tracking-widest font-black opacity-50">Paris / Remote</span>
            </div>
            <div className="p-8 border border-gray-100 rounded-2xl flex justify-between items-center group hover:bg-black hover:text-white transition-all cursor-pointer">
              <span className="font-bold">Senior Backend Engineer</span>
              <span className="text-[10px] uppercase tracking-widest font-black opacity-50">London / Remote</span>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
