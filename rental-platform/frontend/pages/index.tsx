import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { API_BASE_URL, BRAND_NAME, INSTAGRAM_URL, assetUrl } from '../lib/config';

export default function Home() {
  const router = useRouter();
  const [guest, setGuest] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestedRole, setRequestedRole] = useState('guest');

  const brandName = BRAND_NAME;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    // Subdomain Detection Logic
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host.startsWith('host.')) setRequestedRole('host');
        else if (host.startsWith('conci.')) setRequestedRole('concierge');
        else if (host.startsWith('subcont.')) setRequestedRole('contractor');
    }
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/apartments`);
        setApartments(res.data);      } catch (err: any) {
        setApartments([]);
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
      const res = await axios.post(`${API_BASE_URL}/auth/magic`, { 
        email, 
        fullName, 
        role: requestedRole,
        redirectUrl: window.location.origin + '/magic-callback' 
      });
      if (res.data?.token) {
        const verify = await axios.post(`${API_BASE_URL}/auth/magic/verify`, { token: res.data.token });
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
      const res = await axios.post(`${API_BASE_URL}/auth/magic`, { 
        email, 
        role: requestedRole,
        redirectUrl: window.location.origin + '/magic-callback' 
      });
      if (res.data?.token) {
        const verify = await axios.post(`${API_BASE_URL}/auth/magic/verify`, { token: res.data.token });
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

  return (
    <div className="fade-in-up">
      <Head>
        <title>{`${brandName} | Excellence in Living`}</title>
      </Head>

      <header className="site-header">
        <div className="container site-header-inner">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-4 group">
              <div className="w-10 h-10 lg:w-12 lg:h-12 overflow-hidden rounded-lg group-hover:scale-105 transition-transform duration-500">
                <img src="/tree4fivelogo.png" alt="logo" className="w-full h-full object-cover" />
              </div>
              <span className="brand-text lg:text-2xl">{brandName}</span>
            </Link>
          </div>

          <nav className="hidden lg:flex justify-center items-center gap-12 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
            <Link href="/collections" className="hover:text-black transition">Collections</Link>
            <Link href="/concierge" className="hover:text-black transition">Concierge</Link>
            <Link href="/owners" className="hover:text-black transition">Owners</Link>
          </nav>

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
            <Link href="/collections" className="btn btn-primary !py-3 px-4 sm:!px-8 text-[10px] whitespace-nowrap">Book Now</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative h-[92vh] flex items-center overflow-hidden bg-black">
          <div className="absolute inset-0 z-0">
            {apartments.length > 0 && (
              <img 
                src={assetUrl(apartments[0].photos?.[0])} 
                className="w-full h-full object-cover opacity-60 scale-110" 
                style={{ animation: 'heroScale 20s infinite alternate' }}
                alt="Hero"
              />
            )}
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
                <Link href="/collections" className="btn btn-gold px-6 sm:px-12 whitespace-nowrap text-[10px] sm:text-sm">View Collection</Link>
                <Link href="/story" className="btn glass-panel text-white border-white/20 px-6 sm:px-12 whitespace-nowrap text-[10px] sm:text-sm">Our Story</Link>
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
              <span className="text-white font-bold text-sm">{apartments.length} Active Stays</span>
            </div>
          </div>
        </section>

        <section className="py-32 bg-white">
          <div className="container">
            <div className="flex flex-col lg:flex-row justify-between items-end mb-20 gap-8">
              <div>
                <h2 className="text-[11px] font-black text-gold uppercase tracking-[0.4em] mb-4">Curated Residences</h2>
                <h3 className="text-4xl lg:text-5xl font-extrabold tracking-tight">Exceptional by nature.</h3>
              </div>
              <div className="flex gap-12 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <button type="button" aria-pressed="true" className="text-black border-b-2 border-black pb-2">All Stays</button>
                <button type="button" disabled title="Coming soon" className="opacity-40 cursor-not-allowed pb-2">Penthouses</button>
                <button type="button" disabled title="Coming soon" className="opacity-40 cursor-not-allowed pb-2">Lofts</button>
                <button type="button" disabled title="Coming soon" className="opacity-40 cursor-not-allowed pb-2">Villas</button>
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
                      <img src={assetUrl(apt.photos?.[0])} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={apt.name} />
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
                      <h4 className="text-2xl font-black mb-2 uppercase tracking-tight">
                        {requestedRole === 'guest' ? 'Request Access' : `${requestedRole} portal`}
                      </h4>
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
                <span className="brand-text text-xl">{brandName}</span>
              </Link>
              <p className="text-gray-500 max-w-sm leading-relaxed font-medium">
                We are dedicated to the art of fine living. Our mission is to connect discerning travelers with the world's most exceptional private residences.
              </p>
            </div>
            
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-gray-400">Support</h5>
              <ul className="space-y-6 text-[11px] font-black uppercase tracking-widest text-gray-500">
                <li><Link href="/help" className="hover:text-black transition">Help Centre</Link></li>
                <li><Link href="/safety" className="hover:text-black transition">Safety Guidelines</Link></li>
                <li><Link href="/cancellation" className="hover:text-black transition">Cancellation Policies</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 text-gray-400">Company</h5>
              <ul className="space-y-6 text-[11px] font-black uppercase tracking-widest text-gray-500">
                <li><Link href="/vision" className="hover:text-black transition">Our Vision</Link></li>
                <li><Link href="/team" className="hover:text-black transition">Join Team</Link></li>
                <li><Link href="/journal" className="hover:text-black transition">Journal</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-32 pt-12 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
            <p>© {currentYear} {brandName}. All Rights Reserved.</p>
            <div className="flex gap-12">
              <Link href="/privacy" className="hover:text-black transition">Privacy</Link>
              <Link href="/terms" className="hover:text-black transition">Terms</Link>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-black transition">Instagram</a>
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
