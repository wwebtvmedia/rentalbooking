import React, { ReactNode, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const [guest, setGuest] = useState<any>(null);
  const router = useRouter();

  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'bestflats.vip';
  const displayTitle = title || `${brandName} | Excellence in Living`;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const raw = localStorage.getItem('guest');
    if (raw) setGuest(JSON.parse(raw));
  }, []);

  const logout = () => {
    localStorage.removeItem('guest');
    localStorage.removeItem('token');
    setGuest(null);
    router.push('/');
  };

  return (
    <div className="fade-in-up min-h-screen flex flex-col bg-white">
      <Head>
        <title>{displayTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
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
              <Link href="/#auth" className="btn btn-outline border-none text-[10px] font-black uppercase tracking-widest whitespace-nowrap hidden sm:block">
                Sign In
              </Link>
            )}
            <button className="btn btn-primary !py-3 px-4 sm:!px-8 text-[10px] whitespace-nowrap">Book Now</button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {children}
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
