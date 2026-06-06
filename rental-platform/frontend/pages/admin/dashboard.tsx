import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { API_BASE_URL } from '../../lib/config';

export default function PlatformDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [guestStats, setGuestStats] = useState<any[]>([]);
  const [hostStats, setHostStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [captcha, setCaptcha] = useState<{ a: number; b: number } | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');

  // Brute-force deterrent: after 3 failed sign-in attempts, require a captcha.
  const CAPTCHA_AFTER = 3;
  const newCaptcha = () => setCaptcha({ a: 1 + Math.floor(Math.random() * 9), b: 1 + Math.floor(Math.random() * 9) });

  const registerFailure = () => {
    const next = failCount + 1;
    setFailCount(next);
    if (next >= CAPTCHA_AFTER) newCaptcha();
  };

  const fetchData = async (opts: { countFailure?: boolean } = {}) => {
    try {
      setLoading(true);
      setError('');
      const base = API_BASE_URL;
      const token = localStorage.getItem('token');
      const headers: any = { Authorization: `Bearer ${token}` };

      const [statsRes, custRes, guestsRes, hostsRes] = await Promise.all([
        axios.get(`${base}/admin/platform/stats`, { headers, withCredentials: true }),
        axios.get(`${base}/admin/platform/customers`, { headers, withCredentials: true }),
        axios.get(`${base}/admin/platform/guests`, { headers, withCredentials: true }),
        axios.get(`${base}/admin/platform/hosts`, { headers, withCredentials: true })
      ]);
      setStats(statsRes.data);
      setCustomers(custRes.data);
      setGuestStats(guestsRes.data.guests || []);
      setHostStats(hostsRes.data.hosts || []);
      setFailCount(0);
      setCaptcha(null);
    } catch (err: any) {
      setStats(null);
      if (opts.countFailure) registerFailure();
      setError('Invalid or missing admin token. Paste a valid admin token to continue.');
    } finally {
      setLoading(false);
    }
  };

  const submitToken = () => {
    // After repeated failures, the captcha must be solved before another attempt.
    if (failCount >= CAPTCHA_AFTER) {
      if (!captcha || parseInt(captchaInput, 10) !== captcha.a + captcha.b) {
        setError('Please solve the verification challenge correctly.');
        newCaptcha();
        setCaptchaInput('');
        return;
      }
    }
    const t = tokenInput.trim();
    if (!t) return;
    localStorage.setItem('token', t);
    setTokenInput('');
    setCaptchaInput('');
    fetchData({ countFailure: true });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setStats(null);
    setCustomers([]);
    setError('');
    setFailCount(0);
    setCaptcha(null);
  };

  const removeUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const base = API_BASE_URL;
      const headers: any = { Authorization: `Bearer ${localStorage.getItem('token')}` };

      await axios.delete(`${base}/admin/platform/users/${id}`, { headers });
      setCustomers(customers.filter(c => c._id !== id));
      alert('Member removed');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove user');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) fetchData();
    else setLoading(false);
  }, []);

  if (loading) return <Layout title="Loading Dashboard..."><div className="py-40 text-center">Analysing metrics...</div></Layout>;

  // Not authenticated -> show the sign-in box (with captcha after repeated failures).
  if (!stats) return (
    <Layout title="Admin Sign-in | bestflats.vip">
      <div className="bg-gray-50 min-h-screen flex items-center justify-center py-20">
        <div className="card bg-white border border-gray-100 p-10 w-full max-w-md">
          <span className="text-gold font-black text-[10px] uppercase tracking-[0.4em] mb-3 inline-block">Enterprise Intelligence</span>
          <h1 className="text-2xl font-black mb-2">Admin Sign-in.</h1>
          <p className="text-sm text-gray-500 mb-6">Paste an admin token to access the platform dashboard.</p>

          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitToken(); }}
            placeholder="Admin token (eyJhbG…)"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-gold"
          />

          {failCount >= CAPTCHA_AFTER && captcha && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Verification — too many attempts</p>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm select-none">{captcha.a} + {captcha.b} = ?</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitToken(); }}
                  placeholder="Answer"
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
            </div>
          )}

          <button
            onClick={submitToken}
            className="w-full bg-black text-white rounded-lg py-3 text-[10px] font-black tracking-widest uppercase hover:bg-gray-800 transition-colors"
          >
            Access Dashboard
          </button>

          {error && <p className="text-red-600 text-[11px] mt-4">{error}</p>}
          {failCount > 0 && failCount < CAPTCHA_AFTER && (
            <p className="text-amber-600 text-[11px] mt-2">{CAPTCHA_AFTER - failCount} attempt(s) left before verification is required.</p>
          )}
          <p className="text-[10px] text-gray-400 mt-6 leading-relaxed">
            Mint a token on the server with <code>gen_token.py</code> using <code>AUTH_JWT_SECRET</code>. It is stored only in this browser.
          </p>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout title="Platform Intelligence | Admin">
      <div className="bg-gray-50 min-h-screen py-20">
        <div className="container">
          <header className="mb-16 flex items-end justify-between">
            <div>
              <span className="text-gold font-black text-[10px] uppercase tracking-[0.4em] mb-4 inline-block">Enterprise Intelligence</span>
              <h1 className="text-4xl font-black">Platform Dashboard.</h1>
            </div>
            <button
              onClick={logout}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
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
                         <div className="flex items-center gap-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">{new Date(c.createdAt).toLocaleDateString()}</p>
                            <button 
                              onClick={() => removeUser(c._id)}
                              className="opacity-0 group-hover:opacity-100 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-all"
                            >
                              Remove
                            </button>
                         </div>
                       </div>
                     ))}
                   </div>
                   <button className="w-full mt-10 btn btn-outline !py-3 text-[9px] font-black tracking-widest uppercase">View All Members</button>
                </div>
              </section>
            </div>
          </div>

          {/* Per-guest intelligence */}
          <section className="mt-16">
            <h2 className="text-xl font-black mb-8 uppercase tracking-widest text-gray-400 text-[11px]">Guests — Connections, Rentals, Concierge & Tips</h2>
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Guest</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Connections</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Rentals</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Concierge Stays</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Total Spent</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Tips</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {guestStats.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6">
                        <p className="font-bold text-sm mb-1">{g.fullName}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest truncate max-w-[200px]">{g.email}</p>
                      </td>
                      <td className="p-6 font-medium">{g.connections}</td>
                      <td className="p-6 font-medium">{g.rentals}</td>
                      <td className="p-6 font-medium">{g.conciergeStays}</td>
                      <td className="p-6 font-bold text-black">${g.totalSpent.toLocaleString()}</td>
                      <td className="p-6 font-medium text-gold">${(g.tips || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {guestStats.length === 0 && <tr><td colSpan={6} className="p-6 text-gray-400 italic text-sm">No guests yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {/* Per-host intelligence + automatic tax */}
          <section className="mt-16">
            <h2 className="text-xl font-black mb-8 uppercase tracking-widest text-gray-400 text-[11px]">Hosts — Residences, Revenue, Automatic Tax & Tips</h2>
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Host</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Connections</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Residences</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Rentals</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Revenue</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Auto Tax</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Concierges</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Tips</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {hostStats.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6">
                        <p className="font-bold text-sm mb-1">{h.fullName}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest truncate max-w-[200px]">{h.email}</p>
                      </td>
                      <td className="p-6 font-medium">{h.connections}</td>
                      <td className="p-6 font-medium">{h.flatCount}</td>
                      <td className="p-6 font-medium">{h.rentals}</td>
                      <td className="p-6 font-bold text-black">${h.revenue.toLocaleString()}</td>
                      <td className="p-6 font-medium text-red-600">${h.automaticTax.toLocaleString()}</td>
                      <td className="p-6 font-medium">{h.concierges}</td>
                      <td className="p-6 font-medium text-gold">${(h.tips || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {hostStats.length === 0 && <tr><td colSpan={8} className="p-6 text-gray-400 italic text-sm">No hosts yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
