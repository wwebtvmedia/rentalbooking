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
        setError(err.response?.data?.error || 'Failed to load apartment');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold tracking-widest uppercase text-xs">Refining your view...</div>;
  if (error || !apartment) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">{error || 'Apartment not found'}</div>;

  return (
    <>
      <Head>
        <title>{apartment.name} | dreamflat</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-white">
        <header className="site-header">
          <div className="container flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white group-hover:rotate-12 transition-transform duration-300">
                <span className="text-xl">🏠</span>
              </div>
              <span className="brand-text">dreamflat</span>
            </Link>
            <button onClick={() => router.back()} className="btn btn-outline border-none text-gray-500 hover:text-black">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Return
            </button>
          </div>
        </header>

        <main className="py-12">
          <div className="container">
            <div className="max-w-6xl mx-auto">
              {/* Header Info */}
              <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">Premier Selection</span>
                    <div className="flex items-center gap-1 text-sm font-bold">
                      <span>★ 4.98</span>
                      <span className="text-gray-400 font-medium">· 124 reviews</span>
                    </div>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-[#202124] tracking-tight mb-4">{apartment.name}</h1>
                  <p className="text-gray-500 font-bold flex items-center gap-2 text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {apartment.address}
                  </p>
                </div>
                <div className="flex gap-4">
                  <button className="btn btn-outline border-gray-100 rounded-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                  <button className="btn btn-outline border-gray-100 rounded-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Save
                  </button>
                </div>
              </div>

              {/* Photo Gallery - Luxury Mosaic */}
              <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 mb-16 h-[400px] md:h-[600px] animate-fade-in overflow-hidden rounded-[32px] shadow-2xl">
                <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden">
                  <img src={apartment.photos?.[0] || '/placeholder.png'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={apartment.name} />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="hidden md:block relative group overflow-hidden">
                  <img src={apartment.photos?.[1] || '/placeholder.png'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="hidden md:block relative group overflow-hidden">
                  <img src={apartment.photos?.[2] || '/placeholder.png'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="hidden md:block relative group overflow-hidden">
                  <img src={apartment.photos?.[3] || '/placeholder.png'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="hidden md:block relative group overflow-hidden">
                  <img src={apartment.photos?.[4] || apartment.photos?.[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  <button className="absolute bottom-6 right-6 btn glass text-white text-xs font-bold border-white/20">Show All Photos</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <div className="lg:col-span-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between pb-10 mb-10 border-b border-gray-100 gap-6">
                    <div>
                      <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Designed by dreamflat</h2>
                      <p className="text-gray-500 font-bold">2 guests · 1 bedroom · 1 bed · 1 bath</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gray-900 flex-shrink-0 flex items-center justify-center text-white text-2xl border-4 border-gray-50">
                      DF
                    </div>
                  </div>

                  <div className="space-y-12 mb-16">
                    <div className="flex gap-6">
                      <div className="text-3xl">🔑</div>
                      <div>
                        <h4 className="font-black text-lg mb-1">Seamless Experience</h4>
                        <p className="text-gray-500 font-medium">Digital check-in and 24/7 concierge at your service.</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-3xl">🎨</div>
                      <div>
                        <h4 className="font-black text-lg mb-1">Architectural Gem</h4>
                        <p className="text-gray-500 font-medium">Curated furniture and bespoke art pieces throughout the property.</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-3xl">✨</div>
                      <div>
                        <h4 className="font-black text-lg mb-1">Spotless Stay</h4>
                        <p className="text-gray-500 font-medium">Professional hospital-grade cleaning before every arrival.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-16">
                    <h2 className="text-2xl font-black text-gray-900 mb-6">The Residence</h2>
                    <p className="text-gray-600 leading-[1.8] text-lg font-medium whitespace-pre-line">
                      {apartment.description || 'Step into a world of refined elegance. This property has been meticulously designed to provide a perfect balance of contemporary luxury and timeless comfort.'}
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-12">
                    <h2 className="text-2xl font-black text-gray-900 mb-8">Curated Amenities</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                      {[
                        { icon: '📶', label: 'Ultra-fast 1Gbps WiFi' },
                        { icon: '🍳', label: 'Chef-grade Kitchen' },
                        { icon: '🧺', label: 'In-suite Laundry' },
                        { icon: '❄️', label: 'Climate Control' },
                        { icon: '💻', label: 'Designer Workspace' },
                        { icon: '🍷', label: 'Private Wine Cellar' }
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-4 text-gray-700 font-bold">
                          <span className="text-2xl">{item.icon}</span>
                          <span className="text-lg tracking-tight">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="sticky top-32">
                    <div className="card p-8 shadow-2xl border-gray-50 ring-1 ring-gray-100">
                      <div className="flex justify-between items-baseline mb-8">
                        <div>
                          <span className="text-3xl font-black text-gray-900">${apartment.pricePerNight}</span>
                          <span className="text-gray-400 font-bold ml-1">/ night</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold">
                          <span>★ 4.98</span>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-8">
                        <div className="grid grid-cols-2 border-b border-gray-200">
                          <div className="p-4 border-r border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Arrival</span>
                            <span className="font-bold text-sm">Add Date</span>
                          </div>
                          <div className="p-4 hover:bg-gray-50 cursor-pointer transition">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Departure</span>
                            <span className="font-bold text-sm">Add Date</span>
                          </div>
                        </div>
                        <div className="p-4 hover:bg-gray-50 cursor-pointer transition">
                          <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Residents</span>
                          <span className="font-bold text-sm">1 Guest</span>
                        </div>
                      </div>

                      <Link href={`/calendar?apartmentId=${apartment._id || apartment.id}`}>
                        <button className="btn btn-luxury w-full py-5 text-lg font-black tracking-tight">
                          Reserve Now
                        </button>
                      </Link>

                      <p className="text-center text-xs text-gray-400 font-bold mt-6 uppercase tracking-widest">
                        Membership required for booking
                      </p>

                      <div className="mt-10 pt-8 border-t border-gray-100 space-y-5">
                        <div className="flex justify-between text-gray-600 font-bold">
                          <span className="underline decoration-gray-200 underline-offset-4">${apartment.pricePerNight} x 5 nights</span>
                          <span>${apartment.pricePerNight * 5}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 font-bold">
                          <span className="underline decoration-gray-200 underline-offset-4">Concierge fee</span>
                          <span>$150</span>
                        </div>
                        <div className="flex justify-between font-black text-xl pt-6 border-t-2 border-gray-900 text-gray-900">
                          <span>Total</span>
                          <span>${apartment.pricePerNight * 5 + 150}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 p-6 bg-gray-50 rounded-[32px] border border-gray-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-xl">🛡️</div>
                      <div>
                        <h4 className="font-black text-sm mb-0.5">Verified Property</h4>
                        <p className="text-xs text-gray-400 font-bold">Exclusively managed by dreamflat</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
