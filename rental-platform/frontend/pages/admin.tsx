import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminPage() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: '', description: '', smallDescription: '', address: '5 rue Honoré d\'Estienne d\'Orves, Suresnes', photos: '', pricePerNight: '', rules: '', lat: '', lon: '', depositAmount: '', ethAddress: '' });
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const loadList = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await axios.get(`${base}/apartments`);
      setList(res.data);
    } catch (err) {
      setMsg('Failed to fetch apartments');
    }
  };

  useEffect(() => { loadList(); }, []);

  const getImgUrl = (path: string) => {
    if (!path) return '/placeholder.png';
    if (path.startsWith('http')) return path;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    return `${base}${path}`;
  };

  const create = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const token = window.prompt('Admin token');
      if (!token) return setMsg('Admin token required');
      const photosArr = [...(uploadedPhotos || []), ...form.photos.split(',').map((s: string) => s.trim()).filter(Boolean)];
      if (photosArr.length < 3) return setMsg('Please provide at least 3 photos (uploaded or URLs)');
      const body = {
        name: form.name,
        description: form.description,
        smallDescription: form.smallDescription,
        address: form.address,
        photos: photosArr,
        pricePerNight: Number(form.pricePerNight),
        depositAmount: form.depositAmount ? Math.round(Number(form.depositAmount) * 100) : undefined,
        ethAddress: form.ethAddress,
        lat: form.lat ? Number(form.lat) : undefined,
        lon: form.lon ? Number(form.lon) : undefined,
        rules: form.rules
      };
      if (editingId) {
        await axios.put(`${base}/apartments/${editingId}`, body, { headers: { Authorization: `Bearer ${token}` } });
        setMsg('Updated');
        setEditingId(null);
      } else {
        await axios.post(`${base}/apartments`, body, { headers: { Authorization: `Bearer ${token}` } });
        setMsg('Created');
      }
      setForm({ name: '', description: '', smallDescription: '', address: '5 rue Honoré d\'Estienne d\'Orves, Suresnes', photos: '', pricePerNight: '', rules: '', lat: '', lon: '', depositAmount: '', ethAddress: '' });
      setUploadedPhotos([]);
      loadList();
    } catch (err: any) {
      setMsg(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Head>
        <title>Admin Dashboard | dreamflat</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>


      <header className="site-header">
        <div className="container site-header-inner">
          <Link href="/" className="flex items-center">
            <div className="w-8 h-8 overflow-hidden rounded-lg flex items-center justify-center mr-2">
              <img src="/tree4fivelogo.png" alt="dreamflat logo" className="w-full h-full object-cover" />
            </div>
            <span className="brand-text">dreamflat Admin</span>
          </Link>

          <Link href="/" className="btn btn-outline text-xs py-1 px-3">
            Back to site
          </Link>
        </div>
      </header>

      <main className="container py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Form Side */}
          <div className="lg:w-1/3">
            <div className="card p-8 sticky top-24">
              <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Apartment' : 'Create Apartment'}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apartment Name</label>
                  <input className="input" placeholder="Luxury Loft" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea className="input h-32" placeholder="Full description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per night ($)</label>
                  <input type="number" className="input" value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guarantee Deposit ($)</label>
                  <input type="number" className="input" placeholder="e.g. 500" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ethereum Wallet Address (USDC)</label>
                  <input className="input" placeholder="0x..." value={form.ethAddress} onChange={(e) => setForm({ ...form, ethAddress: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <div className="flex gap-2 mb-2">
                    <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-outline py-1 px-3 text-xs" onClick={() => {
                      if (!navigator.geolocation) return setMsg('Geolocation not available');
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setForm(prev => ({ ...prev, lat: String(pos.coords.latitude), lon: String(pos.coords.longitude) }));
                        setMsg('GPS location updated');
                      });
                    }}>Use GPS</button>
                    <button className="btn btn-outline py-1 px-3 text-xs" onClick={async () => {
                      if (!form.address) return setMsg('Address is empty');
                      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
                      const res = await fetch(`${base}/geocode?address=${encodeURIComponent(form.address)}`);
                      const j = await res.json();
                      if (j.ok) {
                        setForm(prev => ({ ...prev, lat: String(j.lat), lon: String(j.lon), address: j.display_name || prev.address }));
                        setMsg('Geocoded successfully');
                      }
                    }}>Geocode</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
                  <div className="flex gap-2 mb-2">
                    <input ref={fileRef} type="file" accept="image/*" className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    <button className="btn btn-outline py-1 px-3 text-xs" onClick={async () => {
                      if (!fileRef.current?.files?.length) return;
                      const file = fileRef.current.files[0];
                      const fd = new FormData();
                      fd.append('file', file);
                      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
                      const res = await fetch(`${base}/uploads`, { method: 'POST', body: fd });
                      if (res.ok) {
                        const json = await res.json();
                        setUploadedPhotos(prev => [...prev, json.url]);
                        setMsg('Photo uploaded');
                      }
                    }}>Upload</button>
                  </div>
                  <input className="input text-xs mb-2" placeholder="URL1, URL2, ..." value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uploadedPhotos.map(p => (
                      <img key={p} src={p} className="w-16 h-12 object-cover rounded-md border border-gray-200" alt="Preview" />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={create} className="btn btn-primary flex-1">
                    {editingId ? 'Update Listing' : 'Create Listing'}
                  </button>
                  {editingId && (
                    <button onClick={() => { setEditingId(null); setForm({ name: '', description: '', smallDescription: '', address: '5 rue Honoré d\'Estienne d\'Orves, Suresnes', photos: '', pricePerNight: '', rules: '', lat: '', lon: '', depositAmount: '', ethAddress: '' }); setUploadedPhotos([]); }} className="btn btn-outline">
                      Cancel
                    </button>
                  )}
                </div>

                {msg && <p className={`text-sm mt-2 ${msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? 'text-red-500' : 'text-blue-500'}`}>{msg}</p>}
              </div>
            </div>
          </div>

          {/* List Side */}
          <div className="lg:w-2/3">
            <h2 className="text-2xl font-bold mb-6">Existing Listings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {list.map((a) => (
                <div key={a._id} className="card group">
                  <div className="aspect-video relative bg-gray-200">
                    {a.photos?.[0] ? (
                      <img src={getImgUrl(a.photos[0])} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-[#202124] mb-1">{a.name}</h3>
                    <p className="text-sm text-[#5f6368] mb-4 line-clamp-2">{a.description}</p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="font-bold text-blue-600">${a.pricePerNight}<span className="text-xs text-gray-500 font-normal">/night</span></span>
                      <div className="flex gap-2">
                        <button className="p-2 text-gray-600 hover:text-blue-600 transition" onClick={() => {
                          setEditingId(a._id);
                          setForm({ name: a.name, description: a.description || '', smallDescription: a.smallDescription || '', address: a.address || '', photos: (a.photos || []).join(','), pricePerNight: a.pricePerNight || '', depositAmount: a.depositAmount ? (a.depositAmount / 100) : '', ethAddress: a.ethAddress || '', rules: a.rules || '', lat: a.lat || '', lon: a.lon || '' });
                          setUploadedPhotos(a.photos || []);
                          window.scrollTo({top: 0, behavior: 'smooth'});
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="p-2 text-gray-600 hover:text-red-600 transition" onClick={async () => {
                          const token = window.prompt('Admin token');
                          if (!token) return;
                          const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
                          await axios.delete(`${base}/apartments/${a._id}`, { headers: { Authorization: `Bearer ${token}` } });
                          loadList();
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
