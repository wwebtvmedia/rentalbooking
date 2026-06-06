import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { API_BASE_URL } from '../../lib/config';

export default function HostDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billFrom, setBillFrom] = useState('');
  const [billTo, setBillTo] = useState('');
  const [invoice, setInvoice] = useState<any>(null);
  const [billing, setBilling] = useState(false);

  const generateBill = async () => {
    try {
      setBilling(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (billFrom) params.set('from', billFrom);
      if (billTo) params.set('to', billTo);
      const res = await axios.get(`${API_BASE_URL}/admin/host/invoice?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoice(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate bill');
    } finally {
      setBilling(false);
    }
  };

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
              <div className="card p-8 bg-white border border-gray-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-4">Tips Earned</span>
                <span className="text-3xl font-black text-black">${(data.summary.tips || 0).toLocaleString()}</span>
              </div>
              <div className="card p-8 bg-white border border-gray-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-4">Automatic Tax ({Math.round((data.summary.taxRate || 0) * 100)}%)</span>
                <span className="text-3xl font-black text-black">${(data.summary.automaticTax || 0).toLocaleString()}</span>
                <span className="text-[10px] block mt-4 text-gold">Net ${(data.summary.netRevenue || 0).toLocaleString()}</span>
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

          <section className="mt-16">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8">Generate Bill (with tax)</h2>
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">From</label>
                  <input type="date" value={billFrom} onChange={e => setBillFrom(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">To</label>
                  <input type="date" value={billTo} onChange={e => setBillTo(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm" />
                </div>
                <button onClick={generateBill} disabled={billing} className="bg-black text-white rounded-lg px-6 py-2.5 text-[10px] font-black tracking-widest uppercase hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {billing ? 'Generating…' : 'Generate Bill'}
                </button>
              </div>

              {invoice && (
                <div className="mt-10 border-t border-gray-100 pt-8">
                  <div className="flex justify-between items-baseline mb-6">
                    <p className="font-black text-lg">Invoice — {invoice.invoiceFor?.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{invoice.currency}</p>
                  </div>
                  <table className="w-full text-left text-sm mb-6">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400">
                        <th className="py-2">Date</th><th className="py-2">Booking</th><th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lineItems.map((li: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2">{li.date ? new Date(li.date).toLocaleDateString() : '—'}</td>
                          <td className="py-2 text-gray-500">{String(li.bookingId).slice(-6)}</td>
                          <td className="py-2 text-right">${li.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {invoice.lineItems.length === 0 && <tr><td colSpan={3} className="py-4 text-gray-400 italic">No settled bookings in this period.</td></tr>}
                    </tbody>
                  </table>
                  <div className="flex flex-col items-end gap-1 text-sm">
                    <p>Subtotal: <span className="font-bold">${invoice.subtotal.toLocaleString()}</span></p>
                    <p>Tax ({Math.round(invoice.taxRate * 100)}%): <span className="font-bold">${invoice.taxAmount.toLocaleString()}</span></p>
                    <p className="text-lg font-black">Total: ${invoice.total.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
