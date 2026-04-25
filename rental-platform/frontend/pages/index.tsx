import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

// fallback static apartments (used if API is unavailable)
const FALLBACK_APARTMENTS = [
  { 
    id: 'suresnes-luxury-loft', 
    name: 'The Skyline Loft: Panoramic Views & Luxury Living near Paris',
    lat: 48.87297687408006, 
    lon: 2.2262012958526616, 
    address: 'Suresnes Heights, overlooking Paris skyline',
    description: 'Perched on the hills of Suresnes, this designer loft combines industrial chic with warm, modern luxury. Experience breathtaking views of the Eiffel Tower from your private terrace, unwind in the spa-inspired rain shower, and enjoy a seamless stay with high-end appliances and curated art throughout.',
    smallDescription: 'Luxury Designer Loft with Eiffel Tower Views',
    pricePerNight: 285,
    photos: ['/uploads/appartement/salon.avif', '/uploads/appartement/chambre.avif', '/uploads/appartement/cuisine.avif', '/uploads/appartement/douche.avif']
  }
];

export default function Home() {
  const router = useRouter();
  const [guest, setGuest] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await axios.get(`${base}/apartments`);
        setApartments(res.data);
      } catch (err) {
        setApartments(FALLBACK_APARTMENTS);
      } finally {
        setLoading(false);
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
      // Instead of creating the customer directly, we send a magic link with the name.
      // The account will be created when they click the link (verify).
      const res = await axios.post(`${base}/auth/magic`, { 
        email, 
        fullName, 
        redirectUrl: window.location.origin + '/magic-callback' 
      });
      
      if (res.data?.token) {
        // Dev/Test mode: auto-verify if token is returned
        const verify = await axios.post(`${base}/auth/magic/verify`, { token: res.data.token });
        saveGuest(verify.data.user);
        localStorage.setItem('token', verify.data.token);
        alert('Welcome! Account created and logged in');
      } else {
        alert('Verification email sent! Please click the link in your email to create your account.');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleLogin = async () => {
    if (!email) return alert('Email required');
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await axios.post(`${base}/auth/magic`, { email, redirectUrl: window.location.origin + '/magic-callback' });
      if (res.data?.token) {
        const verify = await axios.post(`${base}/auth/magic/verify`, { token: res.data.token });
        saveGuest(verify.data.user);
        localStorage.setItem('token', verify.data.token);
        alert('Logged in successfully');
      } else {
        alert('Magic link sent to your email');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('guest');
    localStorage.removeItem('token');
    setGuest(null);
  };

  return (
    <>
      <Head>
        <title>dreamflatbytreeforfive | Luxury Apartment Rentals</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-[#f8f9fa]">
        {/* Google-style Header */}
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="flex items-center">
              <span className="text-2xl mr-2">🏠</span>
              <span className="brand-text">dreamflat</span>
            </Link>
            <div className="flex items-center gap-4">
              {guest ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Hi, {guest.fullName.split(' ')[0]}</span>
                  <button onClick={handleLogout} className="btn btn-outline text-xs py-1 px-3">
                    Sign out
                  </button>
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {guest.fullName[0]}
                  </div>
                </div>
              ) : (
                <button onClick={() => window.scrollTo({top: 500, behavior: 'smooth'})} className="btn btn-primary">
                  Sign in
                </button>
              )}
            </div>
          </div>
        </header>

        <main>
          {!guest ? (
            <>
              {/* Hero Section - Search focused */}
              <section className="bg-white py-20 border-b border-gray-200">
                <div className="container text-center">
                  <h2 className="text-5xl font-bold text-[#202124] mb-6 tracking-tight">Find your next stay</h2>
                  <p className="text-xl text-[#5f6368] mb-12 max-w-2xl mx-auto">Luxury apartments curated for comfort and style in the heart of Paris.</p>
                  
                  {/* Google Search Style Bar (Visual only for now) */}
                  <div className="max-w-2xl mx-auto bg-white rounded-full shadow-lg border border-gray-200 p-2 flex items-center">
                    <div className="flex-1 px-6 text-left border-r border-gray-200">
                      <p className="text-xs font-bold text-gray-900 uppercase">Where</p>
                      <p className="text-sm text-gray-500">Search destinations</p>
                    </div>
                    <div className="flex-1 px-6 text-left border-r border-gray-200">
                      <p className="text-xs font-bold text-gray-900 uppercase">Check in</p>
                      <p className="text-sm text-gray-500">Add dates</p>
                    </div>
                    <div className="flex-1 px-6 text-left">
                      <p className="text-xs font-bold text-gray-900 uppercase">Who</p>
                      <p className="text-sm text-gray-500">Add guests</p>
                    </div>
                    <button className="bg-blue-600 p-4 rounded-full text-white hover:bg-blue-700 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </section>

              {/* Auth Section */}
              <section className="py-20 bg-[#f8f9fa]">
                <div className="container">
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="card p-8">
                      <h3 className="text-2xl font-bold mb-6">Welcome back</h3>
                      <div className="space-y-4">
                        <input 
                          type="email"
                          placeholder="Email address" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)}
                          className="input"
                        />
                        <button onClick={handleLogin} className="btn btn-primary w-full py-3 text-base">
                          Sign in with Google-like Link
                        </button>
                      </div>
                    </div>

                    <div className="card p-8">
                      <h3 className="text-2xl font-bold mb-6">New here?</h3>
                      <div className="space-y-4">
                        <input 
                          type="text"
                          placeholder="Full Name" 
                          value={fullName} 
                          onChange={(e) => setFullName(e.target.value)}
                          className="input"
                        />
                        <input 
                          type="email"
                          placeholder="Email address" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)}
                          className="input"
                        />
                        <button onClick={handleCreate} className="btn btn-outline w-full py-3 text-base">
                          Create an account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {/* Listings Section */}
          <section className="py-16">
            <div className="container">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-[#202124]">Available Apartments</h2>
                  <p className="text-[#5f6368] mt-2">Handpicked stays for your comfort</p>
                </div>
                <div className="flex gap-2">
                  {['Entire place', 'Self check-in', 'Free parking', 'Pets allowed'].map(filter => (
                    <button key={filter} className="btn btn-outline py-1.5 px-4 text-xs font-medium border-gray-300 text-gray-700 hover:bg-gray-100">
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {apartments.map((apartment) => (
                    <Link href={`/apartment?id=${apartment._id || apartment.id}`} key={apartment._id || apartment.id}>
                      <div className="group cursor-pointer">
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-gray-200">
                          {apartment.photos && apartment.photos[0] ? (
                            <img 
                              src={apartment.photos[0]} 
                              alt={apartment.name}
                              className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No image available
                            </div>
                          )}
                          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/70 hover:bg-white text-gray-900 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="max-w-[80%]">
                            <h3 className="font-bold text-[#202124] text-lg truncate">{apartment.name}</h3>
                            <p className="text-[#5f6368] text-sm truncate">{apartment.address}</p>
                            <p className="text-[#5f6368] text-sm mt-1">{apartment.smallDescription || 'Premium apartment'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#202124]">${apartment.pricePerNight}</p>
                            <p className="text-xs text-[#5f6368]">night</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        <footer className="bg-white border-t border-gray-200 py-12 mt-20">
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 text-sm text-[#5f6368]">
              <div className="col-span-2">
                <h4 className="font-bold text-[#202124] mb-4">dreamflat</h4>
                <p className="max-w-xs">Connecting travelers with high-quality, comfortable living spaces in the world's most beautiful cities.</p>
              </div>
              <div>
                <h4 className="font-bold text-[#202124] mb-4">Support</h4>
                <ul className="space-y-3">
                  <li className="hover:underline cursor-pointer">Help Center</li>
                  <li className="hover:underline cursor-pointer">Safety information</li>
                  <li className="hover:underline cursor-pointer">Cancellation options</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-[#202124] mb-4">Hosting</h4>
                <ul className="space-y-3">
                  <li className="hover:underline cursor-pointer">List your space</li>
                  <li className="hover:underline cursor-pointer">Host resources</li>
                  <li className="hover:underline cursor-pointer">Community forum</li>
                </ul>
              </div>
              <div className="col-span-2">
                <h4 className="font-bold text-[#202124] mb-4">Subscribe to our newsletter</h4>
                <div className="flex gap-2">
                  <input type="email" placeholder="Email address" className="input py-2" />
                  <button className="btn btn-primary py-2 px-4">Join</button>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
              <div className="flex gap-6">
                <span>© 2026 dreamflat by treeforfive</span>
                <span className="hover:underline cursor-pointer">Privacy</span>
                <span className="hover:underline cursor-pointer">Terms</span>
                <span className="hover:underline cursor-pointer">Sitemap</span>
              </div>
              <div className="flex gap-4">
                <span className="hover:text-gray-900 cursor-pointer">English (US)</span>
                <span className="hover:text-gray-900 cursor-pointer">$ USD</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
