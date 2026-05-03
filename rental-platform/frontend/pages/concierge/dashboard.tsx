import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { API_BASE_URL } from '../../lib/config';

export default function ConciergeDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const base = API_BASE_URL;
        const res = await axios.get(`${base}/admin/concierge/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Access Denied');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Layout title="Concierge Dashboard"><div className="py-40 text-center">Organizing your schedule...</div></Layout>;
  if (error) return <Layout title="Access Denied"><div className="py-40 text-center text-red-600">{error}</div></Layout>;

  return (
    <Layout title="Concierge Intelligence | bestflats.vip">
      <div className="bg-gray-50 min-h-screen py-20">
        <div className="container">
          <header className="mb-16">
            <span className="text-gold font-black text-[10px] uppercase tracking-[0.4em] mb-4 inline-block">Service Management</span>
            <h1 className="text-4xl font-black">Concierge Hub.</h1>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            <div className="lg:col-span-2 space-y-12">
                <section>
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8 text-center sm:text-left">Work Calendar</h2>
                    <div className="space-y-4">
                        {data.schedule.map((job: any) => (
                            <div key={job._id} className="card p-6 bg-white border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gold mb-1">Check-in / Prep</p>
                                    <p className="font-bold text-sm">Guest: {job.fullName}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{new Date(job.start).toLocaleDateString()}</p>
                                </div>
                                <div className="text-center sm:text-right">
                                    <p className="font-bold text-xs">Residence ID</p>
                                    <p className="text-[9px] text-gray-400 font-mono">{job.apartmentId}</p>
                                </div>
                                <button className="btn btn-outline !py-2 !px-4 text-[9px]">Notify Contractor</button>
                            </div>
                        ))}
                        {data.schedule.length === 0 && <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs">No upcoming service events.</div>}
                    </div>
                </section>
            </div>
            
            <div className="space-y-12">
                <section className="card p-10 bg-black text-white">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-8">Financial Overview</h3>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium opacity-70">Gross Tips</span>
                            <span className="text-xl font-black text-gold">${data.earnings.tips.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium opacity-70">Social Charges (Est.)</span>
                            <span className="text-sm font-bold text-red-400">-${data.earnings.taxEstimate.toLocaleString()}</span>
                        </div>
                        <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest">Net Earnings</span>
                            <span className="text-2xl font-black">${data.earnings.netTips.toLocaleString()}</span>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8">Available Sub-Contractors</h2>
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 space-y-6">
                        {data.contractors.map((con: any) => (
                            <div key={con._id} className="flex justify-between items-center group cursor-pointer">
                                <div>
                                    <p className="font-bold text-sm group-hover:text-gold transition-colors">{con.fullName}</p>
                                    <p className="text-[9px] text-gray-400 uppercase tracking-widest">{con.metadata?.specialties?.join(', ') || 'General'}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-xs">✉️</div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
