import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { API_BASE_URL } from '../../lib/config';

export default function HostDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const base = API_BASE_URL;
        const res = await axios.get(`${base}/admin/host/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Access Denied');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Layout title="Host Dashboard"><div className="py-40 text-center">Loading host analytics...</div></Layout>;
  if (error) return <Layout title="Access Denied"><div className="py-40 text-center text-red-600">{error}</div></Layout>;

  return (
    <Layout title="Host Management | bestflats.vip">
      <div className="bg-gray-50 min-h-screen py-20">
        <div className="container">
          <header className="mb-16">
            <span className="text-gold font-black text-[10px] uppercase tracking-[0.4em] mb-4 inline-block">Partner Dashboard</span>
            <h1 className="text-4xl font-black">Host Analytics.</h1>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="card p-8 bg-black text-white">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-4">Total Revenue (Year)</span>
                <span className="text-3xl font-black">${data.summary.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="card p-8 bg-white border border-gray-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-4">Local Tax (Est.)</span>
                <span className="text-3xl font-black text-black">${data.summary.localTaxPayable.toLocaleString()}</span>
              </div>
              <div className="card p-8 bg-white border border-gray-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-4">Managed Flats</span>
                <span className="text-3xl font-black text-black">{data.summary.flatCount}</span>
              </div>
              <div className="card p-8 bg-white border border-gray-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-4">Tax Declaration</span>
                <span className="text-3xl font-black text-black">${data.summary.taxDeclarationEstimate.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8">My Concierges</h3>
                <div className="space-y-6">
                    {data.concierges.map((c: any) => (
                        <div key={c._id} className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center font-bold text-gold text-xs">
                                {c.fullName.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-sm">{c.fullName}</p>
                                <p className="text-[9px] text-gray-400 uppercase tracking-widest">Assigned Specialist</p>
                            </div>
                        </div>
                    ))}
                    {data.concierges.length === 0 && <p className="text-xs text-gray-400 italic">No concierges assigned yet.</p>}
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <section>
                <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8">Property Performance</h2>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Residence</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.flats.map((f: any) => (
                                <tr key={f.id}>
                                    <td className="p-6 font-bold text-sm">{f.name}</td>
                                    <td className="p-6 font-black text-gold">${f.revenue.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section>
                <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8">Recent Guests</h2>
                <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                    <div className="space-y-8">
                        {data.recentBookings.map((b: any) => (
                            <div key={b._id} className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm">{b.fullName}</p>
                                    <p className="text-[9px] text-gray-400 uppercase tracking-widest">{new Date(b.start).toLocaleDateString()} - {new Date(b.end).toLocaleDateString()}</p>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-1 rounded-full">Paid</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
