import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPage() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: '', description: '', smallDescription: '', address: '5 rue Honoré d\'Estienne d\'Orves, Suresnes', photos: '', pricePerNight: '', rules: '', lat: '', lon: '', depositAmount: '' });
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

  const create = async () => {
    try {
      console.log('create() called', form, uploadedPhotos);
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
        depositAmount: form.depositAmount ? Number(form.depositAmount) : undefined,
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
      setForm({ name: '', description: '', smallDescription: '', address: '5 rue Honoré d\'Estienne d\'Orves, Suresnes', photos: '', pricePerNight: '', rules: '', lat: '', lon: '', depositAmount: '' });
      setUploadedPhotos([]);
      loadList();
    } catch (err: any) {
      setMsg(err.response?.data?.error || err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin - Apartments</h1>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ minWidth: 420 }}>
          <h2>Create apartment</h2>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Photos (comma separated URLs)<input value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} /></label>
          <label>Small description (short)<input value={form.smallDescription} onChange={(e) => setForm({ ...form, smallDescription: e.target.value })} /></label>
          <label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /> <button onClick={() => {
            // try to get user's GPS coordinates via browser API
            if (!navigator.geolocation) return setMsg('Geolocation not available in this browser');
            navigator.geolocation.getCurrentPosition((pos) => {
              setForm(prev => ({ ...prev, lat: String(pos.coords.latitude), lon: String(pos.coords.longitude) }));
              setMsg('Location filled from GPS');
            }, (err) => setMsg('Failed to get GPS: ' + err.message));
          }}>Use GPS</button> <button onClick={async () => {
            // geocode the current address via backend
            if (!form.address) return setMsg('Address is empty');
            try {
              const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
              const res = await fetch(`${base}/geocode?address=${encodeURIComponent(form.address)}`);
              const j = await res.json();
              if (!j.ok) return setMsg('Geocoding failed (no results)');
              setForm(prev => ({ ...prev, lat: String(j.lat), lon: String(j.lon), address: j.display_name || prev.address }));
              setMsg('Address geocoded');
            } catch (err: any) {
              setMsg('Geocode error: ' + err.message);
            }
          }}>Geocode</button></label>
          <label>Or upload photo<input ref={fileRef} type="file" accept="image/*" /></label>
          <div style={{ marginTop: 8 }}>
            <button onClick={async () => {
              if (!fileRef.current?.files?.length) return setMsg('No file selected');
              const file = fileRef.current.files[0];
              const reader = new FileReader();
              reader.onload = async () => {
                const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
                try {
                  // try multipart first
                  const fd = new FormData();
                  fd.append('file', file);
                  const res = await fetch(`${base}/uploads`, { method: 'POST', body: fd }).catch((e) => { console.error('fetch error', e); return undefined as any; });
                  if (res && res.ok) {
                    const json = await res.json();
                    setUploadedPhotos(prev => [...prev, json.url]);
                    setMsg('Uploaded');
                    return;
                  }
                  // fallback to base64 JSON if multipart not supported
                  const b64 = (reader.result as string).split(',')[1];
                  const res2 = await fetch(`${base}/uploads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, b64 }) }).catch((e) => { console.error('fetch error 2', e); return undefined as any; });
                  if (res2 && res2.ok) {
                    const json = await res2.json();
                    setUploadedPhotos(prev => [...prev, json.url]);
                    setMsg('Uploaded');
                  } else {
                    const txt = res2 ? await res2.text() : 'no response';
                    setMsg('Upload failed: ' + txt);
                  }
                } catch (err: any) {
                  setMsg(err.message);
                }
              };
              reader.readAsDataURL(file);
            }}>Upload selected</button>
          </div>
          <div style={{ marginTop: 8 }}>
            {uploadedPhotos.map((p) => <img key={p} src={p} style={{ width: 120, height: 80, objectFit: 'cover', marginRight: 8 }} />)}
          </div>
          <label>Price per night<input type="number" value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })} /></label>
          
          <div style={{ marginTop: 8 }}>
            <button onClick={() => { setEditingId(null); setForm({ name: '', description: '', smallDescription: '', address: '5 rue Honoré d\'Estienne d\'Orves, Suresnes', photos: '', pricePerNight: '', rules: '', lat: '', lon: '', depositAmount: '' }); setUploadedPhotos([]); setMsg('Ready to create a new apartment'); }}>New</button>
            <button onClick={create}>{editingId ? 'Update' : 'Create'}</button>
            {editingId && <button onClick={async () => {
              if (!editingId) return; 
              const confirmDel = window.confirm('Delete this apartment?');
              if (!confirmDel) return;
              const token = window.prompt('Admin token');
              if (!token) return setMsg('Admin token required');
              try {
                const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
                await axios.delete(`${base}/apartments/${editingId}`, { headers: { Authorization: `Bearer ${token}` } });
                setMsg('Deleted');
                setEditingId(null);
                setForm({ name: '', description: '', smallDescription: '', address: '5 rue Honoré d\'Estienne d\'Orves, Suresnes', photos: '', pricePerNight: '', rules: '', lat: '', lon: '', depositAmount: '' });
                setUploadedPhotos([]);
                loadList();
              } catch (err: any) { setMsg(err.response?.data?.error || err.message); }
            }}>Delete</button>}
          </div>
          <label>Deposit amount (fixed, USD)<input type="number" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} /></label>
          <label>Rules<textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} /></label>
          <label>Latitude<input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></label>
          <label>Longitude<input value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} /></label>
          {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <h2>Existing apartments</h2>
          <div>
            {list.map((a) => (
              <div key={a._id} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{a.name}</strong>
                  <div>{a.description}</div>
                  <div>Price/night: ${a.pricePerNight}</div>
                  <div>Deposit: {a.depositAmount ? `$${a.depositAmount / 100}` : '—'}</div>
                  <div>Rules: {a.rules}</div>
                  {a.photos && a.photos.length > 0 && <img src={a.photos[0]} alt="photo" style={{ width: 160, height: 100, objectFit: 'cover' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={() => {
                    setEditingId(a._id);
                    setForm({ name: a.name, description: a.description || '', smallDescription: a.smallDescription || '', address: a.address || '', photos: (a.photos || []).join(','), pricePerNight: a.pricePerNight || '', depositAmount: a.depositAmount ? (a.depositAmount / 100) : '', rules: a.rules || '', lat: a.lat || '', lon: a.lon || '' });
                    setUploadedPhotos(a.photos || []);
                    window.scrollTo(0,0);
                  }}>Edit</button>
                  <button onClick={async () => {
                    const token = window.prompt('Admin token');
                    if (!token) return setMsg('Admin token required');
                    try {
                      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
                      await axios.delete(`${base}/apartments/${a._id}`, { headers: { Authorization: `Bearer ${token}` } });
                      setMsg('Deleted');
                      loadList();
                    } catch (err: any) { setMsg(err.response?.data?.error || err.message); }
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}