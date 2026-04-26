import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';

export default function PlatformDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      // We no longer pass an explicit token; Cloudflare verifies the client certificate
      // The browser automatically attaches the installed certificate to the request.
      const [statsRes, custRes] = await Promise.all([
        axios.get(`${base}/admin/platform/stats`, { withCredentials: true }),
        axios.get(`${base}/admin/platform/customers`, { withCredentials: true })
      ]);
      setStats(statsRes.data);
      setCustomers(custRes.data);
    } catch (err: any) {
      setError('A valid Admin Certificate is required to access this dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Layout title="Loading Dashboard..."><div className="py-40 text-center">Analysing metrics...</div></Layout>;
  if (error) return <Layout title="Access Denied"><div className="py-40 text-center text-red-600">{error}</div></Layout>;

  return (
    <Layout title="Platform Intelligence | Admin">
      <div className="bg-gray-50 min-h-screen py-20">
        <div className="container">
          <header className="mb-16">
            <span className="text-gold font-black text-[10px] uppercase tracking-[0.4em] mb-4 inline-block">Enterprise Intelligence</span>
            <h1 className="text-4xl font-black">Platform Dashboard.</h1>
          </header>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="card p-8 bg-black text-white">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-4">Total Revenue</span>
              <span className="text-3xl font-black">${stats.summary.totalRevenue.toLocaleString()}</span>
              <span className="text-[10px] block mt-4 text-gold">↑ 12% vs last month</span>
            </div>
            <div className="card p-8 bg-white border border-gray-100">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-4">Total Residences</span>
              <span className="text-3xl font-black text-black">{stats.summary.flatCount}</span>
              <span className="text-[10px] block mt-4 text-gray-400">Global Inventory</span>
            </div>
            <div className="card p-8 bg-white border border-gray-100">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-4">Total Customers</span>
              <span className="text-3xl font-black text-black">{stats.summary.customerCount}</span>
              <span className="text-[10px] block mt-4 text-gray-400">Verified Members</span>
            </div>
            <div className="card p-8 bg-white border border-gray-100">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-4">Recent Activity</span>
              <span className="text-3xl font-black text-black">{stats.summary.recentBookingsCount}</span>
              <span className="text-[10px] block mt-4 text-gray-400">Bookings (30d)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left: Revenue by Flat */}
            <div className="lg:col-span-2 space-y-12">
              <section>
                <h2 className="text-xl font-black mb-8 uppercase tracking-widest text-gray-400 text-[11px]">Residencial Performance & Analytics</h2>
                <div className="overflow-x-auto bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Residence</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Bookings</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Total Revenue</th>
                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">vs Avg Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.flats.map((flat: any) => (
                        <tr key={flat.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-6">
                            <p className="font-bold text-sm mb-1">{flat.name}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest truncate max-w-[200px]">{flat.address}</p>
                          </td>
                          <td className="p-6 font-medium">{flat.bookings}</td>
                          <td className="p-6 font-bold text-black">${flat.revenue.toLocaleString()}</td>
                          <td className="p-6">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${Number(flat.performanceVsAvg) >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {flat.performanceVsAvg >= 0 ? '+' : ''}{flat.performanceVsAvg}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Right: Customers List */}
            <div className="space-y-12">
              <section>
                <h2 className="text-xl font-black mb-8 uppercase tracking-widest text-gray-400 text-[11px]">Recent Members</h2>
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-8">
                   <div className="space-y-8">
                     {customers.slice(0, 10).map((c: any) => (
                       <div key={c._id} className="flex justify-between items-center group">
                         <div>
                           <p className="font-bold text-sm mb-1 group-hover:text-gold transition-colors">{c.fullName}</p>
                           <p className="text-[10px] text-gray-400 uppercase tracking-widest">{c.email}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">{new Date(c.createdAt).toLocaleDateString()}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                   <button className="w-full mt-10 btn btn-outline !py-3 text-[9px] font-black tracking-widest uppercase">View All Members</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
