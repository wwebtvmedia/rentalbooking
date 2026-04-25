import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

const FALLBACK_APARTMENTS = [
  { 
    id: 'suresnes-modern-stay', 
    name: 'Comfortable and Convenient Stay in the Heart of Suresnes',
    lat: 48.87297687408006, 
    lon: 2.2262012958526616, 
    address: 'Rue Honoré d\'Estienne d\'Orves, Suresnes, 92150, France',
    description: `Located in the charming town of Suresnes, just outside Paris, this modern one-bedroom apartment offers a cozy living space with a comfortable lounge, fully equipped kitchen, and in-unit washing machine.
Enjoy free Wi-Fi and a private bathroom everything you need for a relaxing stay.
Prime Location Near Paris the apartment is ideally located close to top Parisian landmarks, including the Palais des Congrès (6 km), and Eiffel Tower (7 km).`,
    smallDescription: 'Modern one-bedroom apartment just outside Paris',
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
        setApartments(res.data.length ? res.data : FALLBACK_APARTMENTS);
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
      const res = await axios.post(`${base}/auth/magic`, { email, fullName, redirectUrl: window.location.origin + '/magic-callback' });
      if (res.data?.token) {
        const verify = await axios.post(`${base}/auth/magic/verify`, { token: res.data.token });
        saveGuest(verify.data.user);
        localStorage.setItem('token', verify.data.token);
        alert('Welcome! Account created');
      } else {
        alert('Verification link sent to your email');
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
        alert('Logged in');
      } else {
        alert('Magic link sent to your email');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('guest');
    localStorage.removeItem('token');
    setGuest(null);
  };

  const getImgUrl = (path: string) => {
    if (!path) return '/placeholder.png';
    if (path.startsWith('http')) return path;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    return `${base}${path}`;
  };

  return (
    <div className="fade-in-up">
      <Head>
        <title>dreamflat | Excellence in Living</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <header className="site-header">
        <div className="container site-header-inner">
          {/* Left: Logo & Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-4 group">
              <div className="w-10 h-10 lg:w-12 lg:h-12 overflow-hidden rounded-lg group-hover:scale-105 transition-transform duration-500">
                <img src="/tree4fivelogo.png" alt="logo" className="w-full h-full object-cover" />
              </div>
              <span className="brand-text lg:text-2xl">dreamflat</span>
            </Link>
          </div>

          {/* Center: Navigation (Desktop Only) */}
          <nav className="hidden lg:flex justify-center items-center gap-12 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
            <Link href="#" className="hover:text-black transition">Collections</Link>
            <Link href="#" className="hover:text-black transition">Concierge</Link>
            <Link href="#" className="hover:text-black transition">Owners</Link>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-2 sm:gap-8">
            {guest ? (
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 hidden xl:inline">Member: {guest.fullName.split(' ')[0]}</span>
                <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition">Exit</button>
              </div>
            ) : (
              <button 
                onClick={() => document.getElementById('auth')?.scrollIntoView({behavior: 'smooth'})}
                className="btn btn-outline border-none text-[10px] font-black uppercase tracking-widest whitespace-nowrap hidden sm:block"
              >
                Sign In
              </button>
            )}
            <button className="btn btn-primary !py-3 px-4 sm:!px-8 text-[10px] whitespace-nowrap">Book Now</button>
          </div>
        </div>
      </header>

      <main>
        {/* Cinematic Hero */}
        <section className="relative h-[92vh] flex items-center overflow-hidden bg-black">
          <div className="absolute inset-0 z-0">
            <img 
              src={apartments[0]?.photos?.[0] || FALLBACK_APARTMENTS[0].photos[0]} 
              className="w-full h-full object-cover opacity-60 scale-110" 
              style={{ animation: 'heroScale 20s infinite alternate' }}
              alt="Hero"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          </div>
          
          <div className="container relative z-10">
            <div className="max-w-4xl">
              <span className="inline-block mb-6 text-gold font-black text-xs uppercase tracking-[0.4em] fade-in-up" style={{ animationDelay: '0.2s' }}>
                Refined Hospitality
              </span>
              <h1 className="heading-hero text-white mb-10 fade-in-up" style={{ animationDelay: '0.4s' }}>
                Your private <br/> sanctuary <span className="text-gold">awaits.</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-xl leading-relaxed mb-12 fade-in-up" style={{ animationDelay: '0.6s' }}>
                Discover an elite collection of architecturally significant residences, curated for those who demand the extraordinary.
              </p>
              <div className="flex flex-row flex-wrap gap-3 sm:gap-6 fade-in-up" style={{ animationDelay: '0.8s' }}>
                <button className="btn btn-gold px-6 sm:px-12 whitespace-nowrap text-[10px] sm:text-sm">View Collection</button>
                <button className="btn glass-panel text-white border-white/20 px-6 sm:px-12 whitespace-nowrap text-[10px] sm:text-sm">Our Story</button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-16 right-12 z-10 hidden lg:flex items-center gap-12 p-8 glass-panel rounded-2xl">
            <div className="flex flex-col items-start min-w-[120px]">
              <span className="text-[9px] font-black text-gold uppercase tracking-[0.3em] mb-2">Location</span>
              <span className="text-white font-bold text-sm">Paris / Suresnes</span>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="flex flex-col items-start min-w-[120px]">
              <span className="text-[9px] font-black text-gold uppercase tracking-[0.3em] mb-2">Inventory</span>
              <span className="text-white font-bold text-sm">12 Active Stays</span>
            </div>
          </div>
        </section>

        {/* Listings Grid */}
        <section className="py-32 bg-white">
          <div className="container">
            <div className="flex flex-col lg:flex-row justify-between items-end mb-20 gap-8">
              <div>
                <h2 className="text-[11px] font-black text-gold uppercase tracking-[0.4em] mb-4">Curated Residences</h2>
                <h3 className="text-4xl lg:text-5xl font-extrabold tracking-tight">Exceptional by nature.</h3>
              </div>
              <div className="flex gap-12 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <button className="text-black border-b-2 border-black pb-2">All Stays</button>
                <button className="hover:text-black transition pb-2">Penthouses</button>
                <button className="hover:text-black transition pb-2">Lofts</button>
                <button className="hover:text-black transition pb-2">Villas</button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                {[1, 2].map(i => <div key={i} className="aspect-video bg-gray-50 animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
                {apartments.map((apt) => (
                  <Link href={`/apartment?id=${apt._id || apt.id}`} key={apt._id || apt.id} className="group cursor-pointer">
                    <div className="relative aspect-[4/5] mb-8 overflow-hidden rounded-lg">
                      <img src={getImgUrl(apt.photos?.[0])} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={apt.name} />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500" />
                      <div className="absolute top-8 left-8">
                        <span className="bg-white/90 backdrop-blur-md px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-sm">Reserve</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="max-w-[70%]">
                        <h4 className="text-xl font-bold mb-2 group-hover:text-gold transition-colors">{apt.name}</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{apt.smallDescription}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black">${apt.pricePerNight}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">per night</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Membership Section */}
        {!guest && (
          <section id="auth" className="py-40 bg-gray-50">
            <div className="container">
              <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
                <div className="lg:w-1/2 p-16 lg:p-24 bg-black text-white">
                  <h3 className="text-4xl font-extrabold mb-8 tracking-tight">The Membership</h3>
                  <p className="text-gray-400 text-lg mb-16 leading-relaxed">
                    Join our exclusive circle of travelers to unlock priority access, member-only rates, and bespoke concierge services.
                  </p>
                  <ul className="space-y-6">
                    <li className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest">
                      <span className="text-gold text-xl">✓</span> Priority Booking
                    </li>
                    <li className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest">
                      <span className="text-gold text-xl">✓</span> Insider Events
                    </li>
                    <li className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest">
                      <span className="text-gold text-xl">✓</span> Personalized Stays
                    </li>
                  </ul>
                </div>
                <div className="lg:w-1/2 p-16 lg:p-24 flex flex-col justify-center">
                  <div className="space-y-12">
                    <div>
                      <h4 className="text-2xl font-black mb-2">Request Access</h4>
                      <p className="text-gray-500 font-medium">Please provide your details below.</p>
                    </div>
                    
                    <div className="space-y-4">
                      <input 
                        type="text" 
                        placeholder="Your Full Name" 
                        className="input-luxury"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      <input 
                        type="email" 
                        placeholder="Email Address" 
                        className="input-luxury"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-row gap-4">
                      <button onClick={handleCreate} className="btn btn-primary flex-1">Create Account</button>
                      <button onClick={handleLogin} className="btn btn-outline flex-1">Sign In</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-32">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-20">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 overflow-hidden rounded-lg">
                  <img src="/tree4fivelogo.png" alt="logo" className="w-full h-full object-cover" />
                </div>
                <span className="brand-text text-xl">dreamflat</span>
              </Link>
              <p className="text-gray-500 max-w-sm leading-relaxed font-medium">
                We are dedicated to the art of fine living. Our mission is to connect discerning travelers with the world's most exceptional private residences.
              </p>
            </div>
            
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-gray-400">Support</h5>
              <ul className="space-y-6 text-[11px] font-black uppercase tracking-widest text-gray-500">
                <li><Link href="#" className="hover:text-black transition">Help Centre</Link></li>
                <li><Link href="#" className="hover:text-black transition">Safety Guidelines</Link></li>
                <li><Link href="#" className="hover:text-black transition">Cancellation Policies</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-gray-400">Company</h5>
              <ul className="space-y-6 text-[11px] font-black uppercase tracking-widest text-gray-500">
                <li><Link href="#" className="hover:text-black transition">Our Vision</Link></li>
                <li><Link href="#" className="hover:text-black transition">Join Team</Link></li>
                <li><Link href="#" className="hover:text-black transition">Journal</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-32 pt-12 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
            <p>© 2026 dreamflat by treeforfive. All Rights Reserved.</p>
            <div className="flex gap-12">
              <Link href="#" className="hover:text-black transition">Privacy</Link>
              <Link href="#" className="hover:text-black transition">Terms</Link>
              <Link href="#" className="hover:text-black transition">Instagram</Link>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes heroScale {
          from { transform: scale(1.1); }
          to { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
