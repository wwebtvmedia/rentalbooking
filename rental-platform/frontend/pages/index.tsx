import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

// fallback static apartments (used if API is unavailable)
const FALLBACK_APARTMENTS = [
  { id: 'apt1', name: 'Sea View Apartment', lat: 51.5074, lon: -0.1278, description: 'Bright two-bedroom with sea view.' },
  { id: 'apt2', name: 'City Center Loft', lat: 51.5155, lon: -0.0922, description: 'Stylish loft in the heart of the city.' },
  { id: 'apt3', name: 'Quiet Garden Flat', lat: 51.5033, lon: -0.1195, description: 'Cozy flat overlooking a private garden.' }
];


export default function Home() {
  const router = useRouter();
  const [guest, setGuest] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [apartments, setApartments] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await axios.get(`${base}/apartments`);
        setApartments(res.data);
      } catch (err) {
        setApartments(FALLBACK_APARTMENTS);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('guest');
    if (raw) setGuest(JSON.parse(raw));
  }, []);

  const saveGuest = (g: any) => {
    setGuest(g);
    localStorage.setItem('guest', JSON.stringify(g));
  };

  const handleCreate = async () => {
    if (!fullName || !email) return alert('Name and email required');
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await axios.post(`${base}/customers`, { fullName, email });
      // automatically login (get token)
      const login = await axios.post(`${base}/auth/login`, { email: res.data.email, name: res.data.fullName });
      saveGuest(res.data);
      localStorage.setItem('token', login.data.token);
      alert('Guest created and logged in');
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleLogin = async () => {
    if (!email) return alert('Email required');
    try {
      // prefer magic-link flow
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await axios.post(`${base}/auth/magic`, { email, redirectUrl: window.location.origin + '/magic-callback' });
      // in dev/test the server may return the token directly; otherwise the link will be emailed / logged
      if (res.data?.token) {
        // exchange immediately
        const verify = await axios.post(`${base}/auth/magic/verify`, { token: res.data.token });
        saveGuest(verify.data.user);
        localStorage.setItem('token', verify.data.token);
        alert('Logged in (magic link exchanged)');
      } else {
        alert('Magic link sent (check your email or the server logs)');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('guest');
    setGuest(null);
  };



  return (
    <div style={{ padding: 20 }}>
      <h1>Rental Platform</h1>

      {!guest ? (
        <div style={{ display: 'flex', gap: 40 }}>
          <div style={{ maxWidth: 400 }}>
            <h2>Create Guest</h2>
            <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: 8 }} />
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 8 }} />
            <button onClick={handleCreate} style={{ marginTop: 8 }}>Create & Login</button>
          </div>

          <div style={{ maxWidth: 400 }}>
            <h2>Login</h2>
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 8 }} />
            <button onClick={handleLogin} style={{ marginTop: 8 }}>Login</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Logged in as:</strong> {guest.fullName} ({guest.email})
            </div>
            <div>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </div>

import Link from 'next/link';

// ... (imports)

// ... (Home component)

          <h2 style={{ marginTop: 20 }}>Choose an apartment</h2>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ minWidth: 300 }}>
              {apartments.map((a) => (
                <Link href={`/apartment?id=${a.id || a._id}`} key={a.id || a._id || a.name}>
                  <div style={{ padding: 10, border: '1px solid #ddd', marginBottom: 8, cursor: 'pointer', background: selected?.id === (a.id || a._id) ? '#f0f8ff' : 'white' }}>
                    <h3 style={{ margin: '0 0 4px 0' }}>{a.name}</h3>
                    <div style={{ fontSize: 14 }}>{a.description}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Lat: {a.lat}, Lon: {a.lon}</div>
                    {a.pricePerNight !== undefined && <div style={{ fontSize: 12, color: '#333' }}>Price/night: ${a.pricePerNight}</div>}
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ color: '#666' }}>Click on an apartment to see its details.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
