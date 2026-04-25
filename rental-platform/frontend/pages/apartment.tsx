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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error || !apartment) return <div className="min-h-screen flex items-center justify-center text-red-600">{error || 'Apartment not found'}</div>;

  return (
    <>
      <Head>
        <title>{apartment.name} | dreamflat</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-white">
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="flex items-center">
              <span className="text-2xl mr-2">🏠</span>
              <span className="brand-text">dreamflat</span>
            </Link>
            <button onClick={() => router.back()} className="btn btn-outline text-xs py-1 px-3">
              ← Back
            </button>
          </div>
        </header>

        <main className="container py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-[#202124] mb-2">{apartment.name}</h1>
            <p className="text-[#5f6368] mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {apartment.address}
            </p>

            {/* Photo Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 h-[300px] md:h-[500px]">
              <div className="md:col-span-2 h-full">
                <img 
                  src={apartment.photos?.[0] || '/placeholder.png'} 
                  className="w-full h-full object-cover rounded-2xl" 
                  alt={apartment.name} 
                />
              </div>
              <div className="hidden md:grid grid-cols-1 grid-rows-2 gap-4 h-full">
                <img src={apartment.photos?.[1] || '/placeholder.png'} className="w-full h-full object-cover rounded-2xl" alt="" />
                <img src={apartment.photos?.[2] || '/placeholder.png'} className="w-full h-full object-cover rounded-2xl" alt="" />
              </div>
              <div className="hidden md:block h-full">
                <img src={apartment.photos?.[3] || '/placeholder.png'} className="w-full h-full object-cover rounded-2xl" alt="" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#202124] mb-4">About this space</h2>
                  <p className="text-[#5f6368] leading-relaxed whitespace-pre-line">
                    {apartment.description || 'Experience comfort and style in this premium apartment.'}
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-8 mb-8">
                  <h2 className="text-2xl font-bold text-[#202124] mb-4">What this place offers</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: '📶', label: 'Fast WiFi' },
                      { icon: '🍳', label: 'Fully equipped kitchen' },
                      { icon: '🧺', label: 'Washer' },
                      { icon: '❄️', label: 'Air conditioning' },
                      { icon: '💻', label: 'Dedicated workspace' },
                      { icon: '🚗', label: 'Free parking' }
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3 text-[#5f6368]">
                        <span className="text-xl">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {apartment.rules && (
                  <div className="border-t border-gray-100 pt-8">
                    <h2 className="text-2xl font-bold text-[#202124] mb-4">House Rules</h2>
                    <p className="text-[#5f6368] leading-relaxed">{apartment.rules}</p>
                  </div>
                )}
              </div>

              <div>
                <div className="sticky top-24 card p-6 shadow-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-2xl font-bold text-[#202124]">${apartment.pricePerNight}</span>
                      <span className="text-[#5f6368]"> / night</span>
                    </div>
                  </div>

                  <Link href={`/calendar?apartmentId=${apartment._id || apartment.id}`}>
                    <button className="btn btn-primary w-full py-4 text-lg font-bold">
                      Check Availability
                    </button>
                  </Link>

                  <p className="text-center text-xs text-[#5f6368] mt-4">
                    You won't be charged yet
                  </p>

                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                    <div className="flex justify-between text-[#202124]">
                      <span className="underline">${apartment.pricePerNight} x 5 nights</span>
                      <span>${apartment.pricePerNight * 5}</span>
                    </div>
                    <div className="flex justify-between text-[#202124]">
                      <span className="underline">Cleaning fee</span>
                      <span>$50</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-4 border-t border-gray-100">
                      <span>Total before taxes</span>
                      <span>${apartment.pricePerNight * 5 + 50}</span>
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
