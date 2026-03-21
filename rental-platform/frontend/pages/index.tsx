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
      const res = await axios.post(`${base}/customers`, { fullName, email });
      const login = await axios.post(`${base}/auth/login`, { email: res.data.email, name: res.data.fullName });
      saveGuest(res.data);
      localStorage.setItem('token', login.data.token);
      alert('Welcome! Account created and logged in');
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
        <title>dreamflatbytreeforfive | Luxury Apartment Rentals | Premium Short-term Stays</title>
        <meta name="description" content="Book beautiful, comfortable apartments for your next stay. Browse verified listings near Paris with instant booking on dreamflatbytreeforfive." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="keywords" content="apartment rental, short-term stay, vacation rental, Paris area" />
        <meta property="og:title" content="dreamflatbytreeforfive - Luxury Apartment Rentals" />
        <meta property="og:description" content="Beautiful apartments available for your perfect stay" />
        <meta property="og:type" content="website" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/">
                <h1 className="text-2xl font-bold text-blue-600 cursor-pointer">🏠 dreamflatbytreeforfive</h1>
              </Link>
            </div>
            {guest && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome, <span className="font-semibold text-gray-900">{guest.fullName}</span></p>
                <button onClick={handleLogout} className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>

        {!guest ? (
          <>
            {/* Hero Section */}
            <section className="relative h-96 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
              <div className="absolute inset-0 bg-black opacity-40"></div>
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center items-center text-center">
                <h2 className="text-5xl font-bold mb-4">Welcome to dreamflatbytreeforfive</h2>
                <p className="text-xl text-blue-100 mb-8">Discover beautiful apartments for your perfect getaway</p>
              </div>
            </section>

            {/* Auth Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                {/* Login Card */}
                <div className="bg-white rounded-lg shadow-md p-8 border-t-4 border-blue-600">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input 
                        type="email"
                        placeholder="your@email.com" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                    <button 
                      onClick={handleLogin}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                    >
                      Sign In with Magic Link
                    </button>
                  </div>
                </div>

                {/* Signup Card */}
                <div className="bg-white rounded-lg shadow-md p-8 border-t-4 border-green-600">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input 
                        type="text"
                        placeholder="John Doe" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input 
                        type="email"
                        placeholder="your@email.com" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                      />
                    </div>
                    <button 
                      onClick={handleCreate}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                    >
                      Create Account & Login
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Apartments Preview */}
            <section className="bg-gray-50 py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Popular Listings</h2>
                <p className="text-center text-gray-600 mb-12">Browse our curated selection of luxury apartments</p>

                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Loading apartments...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {apartments.map((apartment) => (
                      <Link href={`/apartment?id=${apartment._id || apartment.id}`} key={apartment._id || apartment.id}>
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition duration-300 cursor-pointer transform hover:scale-105">
                          <div className="relative h-64 bg-gray-200">
                            {apartment.photos && apartment.photos[0] ? (
                              <img 
                                src={apartment.photos[0]} 
                                alt={apartment.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-gray-500">
                                No image
                              </div>
                            )}
                            <div className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 shadow-md">
                              <p className="text-lg font-bold text-blue-600">${apartment.pricePerNight || 'N/A'}</p>
                              <p className="text-xs text-gray-600">/night</p>
                            </div>
                          </div>
                          <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{apartment.name}</h3>
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{apartment.smallDescription || apartment.description.substring(0, 80)}</p>
                            <div className="flex items-center text-gray-600 mb-4">
                              <span className="text-sm">📍 {apartment.address?.split(',')[0] || 'Location'}</span>
                            </div>
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200">
                              View Details
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Logged In - Browse Apartments */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Browse Our Apartments</h2>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Loading apartments...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {apartments.map((apartment) => (
                    <Link href={`/apartment?id=${apartment._id || apartment.id}`} key={apartment._id || apartment.id}>
                      <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition duration-300 cursor-pointer transform hover:scale-105">
                        <div className="relative h-72 bg-gray-200">
                          {apartment.photos && apartment.photos[0] ? (
                            <img 
                              src={apartment.photos[0]} 
                              alt={apartment.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-gray-500">
                              No image
                            </div>
                          )}
                          <div className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 shadow-md">
                            <p className="text-lg font-bold text-blue-600">${apartment.pricePerNight || 'N/A'}</p>
                            <p className="text-xs text-gray-600">/night</p>
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{apartment.name}</h3>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{apartment.smallDescription || apartment.description.substring(0, 80)}</p>
                          <div className="flex items-center text-gray-600 mb-4">
                            <span className="text-sm">📍 {apartment.address?.split(',')[0] || 'Location'}</span>
                          </div>
                          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200">
                            Book Now
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h4 className="font-bold mb-4">About dreamflatbytreeforfive</h4>
                <p className="text-gray-400 text-sm">Your trusted platform for luxury apartment rentals</p>
              </div>
              <div>
                <h4 className="font-bold mb-4">Quick Links</h4>
                <ul className="text-gray-400 text-sm space-y-2">
                  <li><a href="#" className="hover:text-white">Browse Apartments</a></li>
                  <li><a href="#" className="hover:text-white">About Us</a></li>
                  <li><a href="#" className="hover:text-white">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Support</h4>
                <ul className="text-gray-400 text-sm space-y-2">
                  <li><a href="#" className="hover:text-white">Help Center</a></li>
                  <li><a href="#" className="hover:text-white">Booking Guide</a></li>
                  <li><a href="#" className="hover:text-white">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Legal</h4>
                <ul className="text-gray-400 text-sm space-y-2">
                  <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
              <p>&copy; 2026 dreamflatbytreeforfive. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

