import React from 'react';
import Layout from '../components/Layout';

export default function HelpPage() {
  return (
    <Layout title="Help Centre">
      <section className="py-40">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-black mb-12">How can we help?</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
            <div>
              <h3 className="font-bold mb-4 uppercase tracking-widest text-gold text-xs">Bookings</h3>
              <ul className="space-y-4 text-gray-500">
                <li className="hover:text-black cursor-pointer transition">How to modify a stay</li>
                <li className="hover:text-black cursor-pointer transition">Deposit requirements</li>
                <li className="hover:text-black cursor-pointer transition">Check-in procedures</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 uppercase tracking-widest text-gold text-xs">Payments</h3>
              <ul className="space-y-4 text-gray-500">
                <li className="hover:text-black cursor-pointer transition">Credit card support</li>
                <li className="hover:text-black cursor-pointer transition">Paying with USDC</li>
                <li className="hover:text-black cursor-pointer transition">Refund timelines</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
