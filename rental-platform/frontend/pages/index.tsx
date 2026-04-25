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
        <title>dreamflat | Luxury Living</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Luxury Header */}
        <header className="site-header">
          <div className="container flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 overflow-hidden rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <img src="/tree4fivelogo.png" alt="dreamflat logo" className="w-full h-full object-cover" />
              </div>
              <span className="brand-text">dreamflat</span>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
                <Link href="#" className="hover:text-black transition">Destinations</Link>
                <Link href="#" className="hover:text-black transition">Experiences</Link>
                <Link href="#" className="hover:text-black transition">About</Link>
              </nav>
              {guest ? (
                <div className="flex items-center gap-4 border-l border-gray-100 pl-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Welcome</p>
                    <p className="text-sm font-bold">{guest.fullName.split(' ')[0]}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold cursor-pointer hover:scale-105 transition" onClick={handleLogout}>
                    {guest.fullName[0]}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => document.getElementById('auth-section')?.scrollIntoView({behavior: 'smooth'})} 
                  className="btn btn-primary"
                >
                  Join the Club
                </button>
              )}
            </div>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="relative h-[85vh] flex items-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10" />
              <img 
                src={apartments[0]?.photos?.[0] || FALLBACK_APARTMENTS[0].photos[0]} 
                alt="Luxury living" 
                className="w-full h-full object-cover scale-105"
                style={{ animation: 'pulse 8s infinite' }}
              />
            </div>
            
            <div className="container relative z-20">
              <div className="max-w-3xl animate-fade-in">
                <span className="inline-block py-1 px-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-6">
                  Curated for the Exceptional
                </span>
                <h2 className="text-6xl md:text-8xl font-extrabold text-white mb-8 tracking-tighter leading-[0.9]">
                  Live where <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">dreams reside.</span>
                </h2>
                <p className="text-xl text-white/80 mb-12 max-w-xl font-medium leading-relaxed">
                  Discover an exclusive collection of designer lofts and hidden architectural gems in the heart of Europe.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="btn btn-luxury py-4 px-10 text-lg">
                    Explore Collection
                  </button>
                  <button className="btn glass py-4 px-10 text-lg text-white font-bold border-white/30 hover:bg-white/20">
                    Watch Film
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Listing Section */}
          <section className="py-24 bg-white">
            <div className="container">
              <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                <div className="max-w-xl">
                  <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Exceptional Properties</h2>
                  <p className="text-lg text-gray-500 font-medium">From suresnes luxury lofts to eiffel-view penthouses.</p>
                </div>
                <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                  {['Paris', 'Suresnes', 'Versailles'].map((loc, i) => (
                    <button key={loc} className={`px-6 py-2 rounded-xl text-sm font-bold transition ${i === 0 ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}>
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[4/5] bg-gray-100 rounded-3xl mb-4" />
                      <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {apartments.map((apartment) => (
                    <Link href={`/apartment?id=${apartment._id || apartment.id}`} key={apartment._id || apartment.id}>
                      <div className="card border-none group">
                        <div className="relative aspect-[4/5] rounded-[24px] overflow-hidden mb-6">
                          <img 
                            src={apartment.photos?.[0] || '/placeholder.png'} 
                            alt={apartment.name}
                            className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="absolute top-6 right-6 z-10">
                            <button className="w-12 h-12 rounded-full glass flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            </button>
                          </div>
                          <div className="absolute bottom-6 left-6 text-white translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                            <span className="text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">Book Now</span>
                          </div>
                        </div>
                        <div className="px-2">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-extrabold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">{apartment.name}</h3>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold text-gray-900">★ 4.98</span>
                            </div>
                          </div>
                          <p className="text-gray-500 font-medium mb-4 text-sm">{apartment.smallDescription || 'Premium architecture & design'}</p>
                          <div className="flex items-center gap-1">
                            <span className="font-black text-lg">${apartment.pricePerNight}</span>
                            <span className="text-sm text-gray-400 font-bold">/ night</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          {!guest && (
            <section id="auth-section" className="py-24 bg-gray-50 border-y border-gray-100">
              <div className="container">
                <div className="max-w-5xl mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
                  <div className="p-12 md:p-20 bg-black text-white flex flex-col justify-center">
                    <h3 className="text-4xl font-extrabold mb-6 tracking-tight">Access the Collection</h3>
                    <p className="text-gray-400 text-lg mb-10 font-medium leading-relaxed">
                      Join dreamflat to unlock our full list of luxury properties and exclusive member benefits.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">✓</div>
                        <span className="font-bold">Priority Booking</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">✓</div>
                        <span className="font-bold">Member-only Rates</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-12 md:p-20 flex flex-col justify-center">
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-2xl font-black mb-2">Sign in or Join</h4>
                        <p className="text-gray-500 font-medium">Verify your email to continue</p>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <input 
                            type="text"
                            placeholder="Your full name" 
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
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <button onClick={handleLogin} className="btn btn-outline border-2 py-4">
                            Sign In
                          </button>
                          <button onClick={handleCreate} className="btn btn-primary py-4">
                            Create Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Luxury Newsletter */}
          <section className="py-24">
            <div className="container text-center">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-4xl font-extrabold mb-6 tracking-tight">Stay Inspired</h3>
                <p className="text-lg text-gray-500 mb-10 font-medium">Get the latest architectural finds and luxury stay offers delivered to your inbox.</p>
                <div className="flex gap-4 p-2 bg-gray-50 rounded-2xl border border-gray-100">
                  <input type="email" placeholder="Email address" className="bg-transparent border-none flex-1 px-6 outline-none font-medium" />
                  <button className="btn btn-primary px-8">Subscribe</button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-white border-t border-gray-100 py-20">
          <div className="container">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12">
              <div className="max-w-xs">
                <Link href="/" className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 overflow-hidden rounded-lg flex items-center justify-center">
                    <img src="/tree4fivelogo.png" alt="dreamflat logo" className="w-full h-full object-cover" />
                  </div>
                  <span className="brand-text text-xl">dreamflat</span>
                </Link>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Redefining hospitality through exceptional architecture and curated experiences.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-16">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-widest mb-6">Company</h4>
                  <ul className="space-y-4 text-gray-500 font-bold text-sm">
                    <li className="hover:text-black cursor-pointer">About</li>
                    <li className="hover:text-black cursor-pointer">Careers</li>
                    <li className="hover:text-black cursor-pointer">Journal</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-widest mb-6">Support</h4>
                  <ul className="space-y-4 text-gray-500 font-bold text-sm">
                    <li className="hover:text-black cursor-pointer">Help Center</li>
                    <li className="hover:text-black cursor-pointer">Safety</li>
                    <li className="hover:text-black cursor-pointer">Policies</li>
                  </ul>
                </div>
                <div className="hidden sm:block">
                  <h4 className="font-black text-sm uppercase tracking-widest mb-6">Legal</h4>
                  <ul className="space-y-4 text-gray-500 font-bold text-sm">
                    <li className="hover:text-black cursor-pointer">Privacy</li>
                    <li className="hover:text-black cursor-pointer">Terms</li>
                    <li className="hover:text-black cursor-pointer">Cookies</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-20 pt-8 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-6 text-xs font-bold text-gray-400 tracking-widest uppercase">
              <p>© 2026 dreamflat by treeforfive</p>
              <div className="flex gap-8">
                <span className="hover:text-black cursor-pointer">Instagram</span>
                <span className="hover:text-black cursor-pointer">LinkedIn</span>
                <span className="hover:text-black cursor-pointer">Twitter</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
