import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Head from 'next/head';
import { API_BASE_URL } from '../lib/config';

export default function MagicCallback() {
  const router = useRouter();
  const { token } = router.query;

  useEffect(() => {
    if (!token) return;
    const verify = async () => {
      try {
        const base = API_BASE_URL;
        const res = await axios.post(`${base}/auth/magic/verify`, { token });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('guest', JSON.stringify(res.data.user));
        router.push('/');
      } catch (err: any) {
        alert('Magic link verification failed: ' + (err.response?.data?.error || err.message));
        router.push('/magic-request');
      }
    };
    verify();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6">
      <Head>
        <title>Verifying... - bestflats.vip</title>

      </Head>
      
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-[#202124]">Verifying your link</h2>
        <p className="text-[#5f6368] mt-2">Please wait while we sign you in securely...</p>
      </div>
    </div>
  );
}
