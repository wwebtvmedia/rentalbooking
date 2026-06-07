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

  // Host self-service: propose a new property. It stays hidden until an admin
  // approves it via the validation email, so we surface each flat's status here.
  const [myFlats, setMyFlats] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [flatForm, setFlatForm] = useState<any>({ name: '', description: '', pricePerNight: '', depositAmount: '', address: '', photos: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const loadMyFlats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/admin/host/flats`, { headers: { Authorization: `Bearer ${token}` } });
      setMyFlats(res.data);
    } catch { /* non-fatal: the metrics view still works */ }
  };

  const submitFlat = async () => {
    if (!flatForm.name.trim()) { setSubmitMsg('Property name is required.'); return; }
    setSubmitting(true);
    setSubmitMsg('');
    try {
      const token = localStorage.getItem('token');
      const photos = String(flatForm.photos).split(',').map((s: string) => s.trim()).filter(Boolean);
      const body = {
        name: flatForm.name.trim(),
        description: flatForm.description,
        address: flatForm.address,
        photos,
        pricePerNight: flatForm.pricePerNight ? Number(flatForm.pricePerNight) : undefined,
        depositAmount: flatForm.depositAmount ? Number(flatForm.depositAmount) : undefined,
      };
      await axios.post(`${API_BASE_URL}/admin/host/flats`, body, { headers: { Authorization: `Bearer ${token}` } });
      setSubmitMsg('✓ Submitted. An admin must approve it via the emailed link before it appears on Book Now.');
      setFlatForm({ name: '', description: '', pricePerNight: '', depositAmount: '', address: '', photos: '' });
      setShowForm(false);
      loadMyFlats();
    } catch (err: any) {
      setSubmitMsg(err.response?.data?.error || err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

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
        loadMyFlats();
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
          <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-gold font-black text-[10px] uppercase tracking-[0.4em] mb-4 inline-block">Partner Dashboard</span>
              <h1 className="text-4xl font-black">Host Analytics.</h1>
            </div>
            <button
              onClick={() => { setShowForm(v => !v); setSubmitMsg(''); }}
              className="bg-gold text-white rounded-lg px-6 py-3 text-[10px] font-black tracking-widest uppercase hover:opacity-90 transition-opacity"
            >
              {showForm ? 'Close' : '+ Add a property'}
            </button>
          </header>

          {/* Host self-service: submit a property for admin approval. */}
          <section className="mb-16">
            {showForm && (
              <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 mb-8">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Submit a new property</h2>
                <p className="text-xs text-gray-500 mb-6">It stays hidden from Book Now until an admin approves it via the validation email we send them.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">Property name *</label>
                    <input value={flatForm.name} onChange={e => setFlatForm({ ...flatForm, name: e.target.value })} placeholder="Seaside Villa" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">Address</label>
                    <input value={flatForm.address} onChange={e => setFlatForm({ ...flatForm, address: e.target.value })} placeholder="12 Rue de la Mer, Nice" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">Price per night ($)</label>
                    <input type="number" value={flatForm.pricePerNight} onChange={e => setFlatForm({ ...flatForm, pricePerNight: e.target.value })} placeholder="180" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">Guarantee deposit ($)</label>
                    <input type="number" value={flatForm.depositAmount} onChange={e => setFlatForm({ ...flatForm, depositAmount: e.target.value })} placeholder="500" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">Description</label>
                    <textarea value={flatForm.description} onChange={e => setFlatForm({ ...flatForm, description: e.target.value })} placeholder="Full description…" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-gold" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">Photo URLs (comma-separated)</label>
                    <input value={flatForm.photos} onChange={e => setFlatForm({ ...flatForm, photos: e.target.value })} placeholder="https://… , https://…" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <button onClick={submitFlat} disabled={submitting} className="bg-black text-white rounded-lg px-6 py-2.5 text-[10px] font-black tracking-widest uppercase hover:bg-gray-800 transition-colors disabled:opacity-50">
                    {submitting ? 'Submitting…' : 'Submit for approval'}
                  </button>
                  {submitMsg && <p className={`text-[11px] ${submitMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{submitMsg}</p>}
                </div>
              </div>
            )}
            {!showForm && submitMsg && <p className="text-green-600 text-sm mb-6">{submitMsg}</p>}

            {myFlats.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-6">My properties</h2>
                <div className="space-y-3">
                  {myFlats.map((f: any) => (
                    <div key={f._id} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-sm">{f.name}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest">{f.address || 'No address'}</p>
                      </div>
                      {f.status === 'pending' ? (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 px-3 py-1 rounded-full">Pending review</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-green-50 text-green-600 px-3 py-1 rounded-full">Live</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

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
