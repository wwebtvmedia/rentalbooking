import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';

export default function ApartmentPage() {
  const router = useRouter();
  const { id } = router.query;
  const [apartment, setApartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await axios.get(`${base}/apartments/${id}`);
        setApartment(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load residence');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const getImgUrl = (path: string) => {
    if (!path) return '/placeholder.png';
    if (path.startsWith('http')) return path;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    return `${base}${path}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black tracking-[0.4em] uppercase text-[10px]">Refining View...</div>;
  if (error || !apartment) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">{error || 'Residence not found'}</div>;

  return (
    <div className="fade-in-up">
      <Head>
        <title>{apartment.name} | bestflats.vip</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <header className="site-header">
        <div className="container flex justify-between items-center w-full">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 overflow-hidden rounded-lg">
              <img src="/tree4fivelogo.png" alt="logo" className="w-full h-full object-cover" />
            </div>
            <span className="brand-text">bestflats.vip</span>
          </Link>
          <button onClick={() => router.back()} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition">
            ← Return to Collection
          </button>
        </div>
      </header>

      <main className="py-24">
        <div className="container">
          <div className="max-w-7xl mx-auto">
            {/* Title & Intro */}
            <div className="mb-16 fade-in-up">
              <div className="flex items-center gap-4 mb-8">
                <span className="text-gold font-black text-[10px] uppercase tracking-[0.3em]">Premier Residence</span>
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">★ 5.0 Rating</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tighter mb-6">{apartment.name}</h1>
              <p className="text-xl text-gray-500 font-medium flex items-center gap-3">
                <span className="text-black">📍</span> {apartment.address}
              </p>
            </div>

            {/* Mosaic Gallery - Ultra Refined */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[400px] lg:h-[750px] mb-24 fade-in-up overflow-hidden rounded-xl shadow-2xl">
              <div className="lg:col-span-2 relative group cursor-pointer">
                <img src={getImgUrl(apartment.photos?.[0])} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Main" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              </div>
              <div className="hidden lg:grid grid-cols-1 grid-rows-2 gap-6">
                <div className="relative group cursor-pointer overflow-hidden">
                  <img src={getImgUrl(apartment.photos?.[1])} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Gallery" />
                </div>
                <div className="relative group cursor-pointer overflow-hidden">
                  <img src={getImgUrl(apartment.photos?.[2])} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Gallery" />
                </div>
              </div>
              <div className="hidden lg:block relative group cursor-pointer overflow-hidden">
                <img src={getImgUrl(apartment.photos?.[3] || apartment.photos?.[0])} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Gallery" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-24">
              <div className="lg:col-span-8">
                <div className="flex items-center gap-8 pb-12 mb-12 border-b border-gray-100">
                  <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center text-white font-black text-2xl">DF</div>
                  <div>
                    <h2 className="text-2xl font-black mb-1">Residence Managed by bestflats.vip</h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Architectural Significance · Professional Concierge</p>
                  </div>
                </div>

                <div className="prose prose-xl max-w-none mb-20">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gold mb-8">The Experience</h3>
                  <p className="text-2xl leading-[1.7] text-gray-600 font-medium whitespace-pre-line">
                    {apartment.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-12 pt-12 border-t border-gray-100">
                  {[
                    { icon: '📶', label: 'Gigabit Connectivity' },
                    { icon: '🍳', label: 'Gourmet Kitchen' },
                    { icon: '🧺', label: 'Premium Laundry' },
                    { icon: '❄️', label: 'Climate Precision' },
                    { icon: '💻', label: 'Executive Studio' },
                    { icon: '🍷', label: 'Curated Cellar' }
                  ].map(item => (
                    <div key={item.label} className="flex flex-col gap-4">
                      <span className="text-3xl">{item.icon}</span>
                      <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="sticky top-32">
                  <div className="luxury-card !rounded-2xl p-10 bg-white ring-1 ring-gray-100 shadow-2xl">
                    <div className="flex justify-between items-baseline mb-10">
                      <div>
                        <span className="text-4xl font-black">${apartment.pricePerNight}</span>
                        <span className="text-gray-400 font-bold ml-2 uppercase text-[10px] tracking-widest">/ night</span>
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-lg overflow-hidden mb-8">
                      <div className="grid grid-cols-2 border-b border-gray-100">
                        <div className="p-5 border-r border-gray-100 hover:bg-gray-50 cursor-pointer">
                          <span className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Arrival</span>
                          <span className="font-bold text-sm">Select Date</span>
                        </div>
                        <div className="p-5 hover:bg-gray-50 cursor-pointer">
                          <span className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Departure</span>
                          <span className="font-bold text-sm">Select Date</span>
                        </div>
                      </div>
                      <div className="p-5 hover:bg-gray-50 cursor-pointer">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Residents</span>
                        <span className="font-bold text-sm">1 Guest</span>
                      </div>
                    </div>

                    <Link href={`/calendar?apartmentId=${apartment._id || apartment.id}`}>
                      <button className="btn btn-gold w-full !py-5 text-[11px] font-black tracking-[0.2em]">
                        Reserve Residence
                      </button>
                    </Link>

                    <div className="mt-12 space-y-6 pt-12 border-t border-gray-50">
                      <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-gray-500">
                        <span>Stay Duration (5 nights)</span>
                        <span className="text-black">${apartment.pricePerNight * 5}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-gray-500">
                        <span>Concierge Services</span>
                        <span className="text-black">$150</span>
                      </div>
                      <div className="flex justify-between text-lg font-black pt-6 border-t border-gray-900 text-black">
                        <span>Total</span>
                        <span>${apartment.pricePerNight * 5 + 150}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-8 bg-gray-50 rounded-2xl flex items-center gap-6">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">🛡️</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-relaxed">
                      This property is part of our <span className="text-black">Verified Collection</span>, ensuring absolute quality.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 py-20 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">bestflats.vip · Excellence in Living</p>
      </footer>
    </div>
  );
}
