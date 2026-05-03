import React, { useState } from 'react';
import axios from 'axios';
import Head from 'next/head';
import { API_BASE_URL } from '../lib/config';
import Link from 'next/link';

export default function MagicRequest() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) return alert('Email required');
    try {
      const base = API_BASE_URL;
      await axios.post(`${base}/auth/magic`, { email, redirectUrl: window.location.origin + '/magic-callback' });
      setSent(true);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6">
      <Head>
        <title>Sign in | bestflats.vip</title>

      </Head>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <div className="w-16 h-16 overflow-hidden rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <img src="/tree4fivelogo.png" alt="bestflats.vip logo" className="w-full h-full object-cover" />
            </div>
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sign in to bestflats.vip</h1>
          <p className="text-[#5f6368] mt-2">Use your email to get a secure sign-in link</p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#202124] mb-2">Check your email</h3>
              <p className="text-[#5f6368] mb-8">We've sent a magic link to <span className="font-medium text-[#202124]">{email}</span>. Click the link in the email to sign in instantly.</p>
              <button onClick={() => setSent(false)} className="btn btn-outline w-full py-3">
                Try a different email
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input 
                  type="email"
                  placeholder="name@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="input" 
                />
              </div>
              <button onClick={handleSend} className="btn btn-primary w-full py-3 text-base">
                Send Magic Link
              </button>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500 font-medium">Secure & Passwordless</span></div>
              </div>
              <Link href="/" className="btn btn-outline w-full py-3 text-base">
                Back to home
              </Link>
            </div>
          )}
        </div>
        
        <p className="text-center text-xs text-[#5f6368] mt-8">
          By signing in, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
