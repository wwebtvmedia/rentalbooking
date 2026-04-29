import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';

export default function PaymentPage() {
  const router = useRouter();
  const { bookingId } = router.query;
  const [booking, setBooking] = useState<any>(null);
  const [apartment, setApartment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [txHash, setTxHash] = useState('');
  const [showCrypto, setShowCrypto] = useState(false);
  const [mounted, setMounted] = useState(false);

  const authHeaders = () => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'bestflats.vip';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await axios.get(`${base}/bookings/${bookingId}`, { headers: authHeaders() });
        setBooking(res.data);        
        // Fetch apartment for ethAddress
        if (res.data.apartmentId) {
          const aptRes = await axios.get(`${base}/apartments/${res.data.apartmentId}`);
          setApartment(aptRes.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      }
    })();
  }, [bookingId]);

  const [stripePromise, setStripePromise] = React.useState<any | null>(null);
  const [StripeReact, setStripeReact] = React.useState<any | null>(null);

  const startPayment = async () => {
    setError('');
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const r = await axios.post(`${base}/payments/create-intent`, { bookingId }, { headers: authHeaders() });
      setClientSecret(r.data.clientSecret || null);

      if (r.data.clientSecret && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        try {
          const stripeJs = await import('@stripe/stripe-js');
          const reactStripe = await import('@stripe/react-stripe-js');
          const p = stripeJs.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);
          setStripePromise(p);
          setStripeReact(reactStripe);
        } catch (e) {
          console.warn('Stripe client libs not available');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const payWithUSDC = async () => {
    if (!apartment?.ethAddress) return alert('This residence is not configured for USDC payments');
    if (!(window as any).ethereum) return alert('Please install MetaMask to pay with USDC');
    
    setLoading(true);
    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];
      
      // Simple transfer of ETH-like value for demo, 
      // In production, use ethers.js to call USDC.transfer(to, amount)
      // For this prototype, we'll prompt for transaction hash after opening wallet
      const txParams = {
        from,
        to: apartment.ethAddress,
        value: '0x0', // 0 ETH
        data: '0x', // No data
      };

      const hash = await eth.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      if (hash) {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const resp = await axios.post(`${base}/payments/record-crypto-payment`, { bookingId, txHash: hash, currency: 'USDC' }, { headers: authHeaders() });
        alert(resp.data?.message || 'Transaction submitted! Redirecting to calendar...');
        router.push('/calendar');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitTxHash = async () => {
    if (!txHash) return alert('Please enter the transaction hash');
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const resp = await axios.post(`${base}/payments/record-crypto-payment`, { bookingId, txHash, currency: 'USDC' }, { headers: authHeaders() });
      alert(resp.data?.message || 'Payment recorded. Redirecting...');
      router.push('/calendar');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const simulateSuccess = async () => {
    setError('');
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      await axios.post(`${base}/payments/${bookingId}/simulate-success`, {}, { headers: authHeaders() });
      alert('Simulated payment success');
      router.push('/calendar');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!bookingId) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Head>
        <title>{`Complete Payment | ${brandName}`}</title>

      </Head>


      <header className="site-header">
        <div className="container site-header-inner">
          <Link href="/" className="flex items-center">
            <div className="w-8 h-8 overflow-hidden rounded-lg flex items-center justify-center mr-2">
              <img src="/tree4fivelogo.png" alt={`${brandName} logo`} className="w-full h-full object-cover" />
            </div>
            <span className="brand-text">{brandName}</span>
          </Link>
          <button onClick={() => router.back()} className="btn btn-outline text-xs py-1 px-3">
            Cancel
          </button>
        </div>
      </header>

      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-[#202124] mb-8 text-center">Complete your booking</h1>
          
          <div className="card p-8">
            <h2 className="text-xl font-bold text-[#202124] mb-6 border-b border-gray-100 pb-4">Booking Summary</h2>
            
            {booking && (
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-[#5f6368]">Guest</span>
                  <span className="font-medium text-[#202124]">{booking.fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#5f6368]">Dates</span>
                  <span className="font-medium text-[#202124]">
                    {new Date(booking.start).toLocaleDateString()} - {new Date(booking.end).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-lg font-bold text-[#202124]">Deposit Amount</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${booking.depositAmount ? (booking.depositAmount / 100).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            )}

            {mounted && (
            <div className="space-y-4">
              <button 
                onClick={startPayment} 
                disabled={loading || !booking || !booking.depositAmount} 
                className="btn btn-primary w-full py-4 text-lg"
              >
                {loading ? 'Processing...' : 'Pay with Credit Card'}
              </button>
              
              <button 
                onClick={() => setShowCrypto(!showCrypto)} 
                className="btn btn-outline w-full py-3 flex items-center justify-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 9.5C15 8.67157 13.6569 8 12 8C10.3431 8 9 8.67157 9 9.5C9 10.3284 10.3431 11 12 11C13.6569 11 15 11.6716 15 12.5C15 13.3284 13.6569 14 12 14C10.3431 14 9 13.3284 9 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {showCrypto ? 'Hide Crypto Options' : 'Pay with USDC (UCP Compatible)'}
              </button>

              {showCrypto && (
                <div className="mt-6 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-6 animate-fade-in">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Pay with USDC</p>
                    <p className="text-xs text-blue-700">Send exactly ${booking ? (booking.depositAmount / 100).toFixed(2) : '0.00'} USDC to the address below</p>
                  </div>
                  
                  {apartment?.ethAddress ? (
                    <div className="space-y-4">
                      <div className="bg-white p-3 rounded-lg border border-blue-200 break-all text-center font-mono text-[10px]">
                        {apartment.ethAddress}
                      </div>
                      
                      <button 
                        onClick={payWithUSDC}
                        disabled={loading}
                        className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                      >
                        <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png" width="18" alt="USDC" />
                        Pay with MetaMask
                      </button>

                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-blue-200"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-blue-50 px-2 text-blue-400 font-bold">or provide hash</span></div>
                      </div>

                      <div className="space-y-2">
                        <input 
                          className="input !bg-white !border-blue-200 text-xs" 
                          placeholder="Transaction Hash (0x...)" 
                          value={txHash}
                          onChange={(e) => setTxHash(e.target.value)}
                        />
                        <button 
                          onClick={submitTxHash}
                          disabled={loading || !txHash}
                          className="w-full btn btn-outline !border-blue-300 !text-blue-700 !py-2 text-xs"
                        >
                          Confirm Transaction Hash
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-red-500 font-medium italic">
                      This residence has not yet provided a wallet address for USDC payments.
                    </p>
                  )}
                </div>
              )}
              
              <button 
                onClick={simulateSuccess} 
                disabled={loading} 
                className="w-full text-[10px] text-gray-400 hover:text-gray-600 transition underline underline-offset-4 decoration-dotted"
              >
                Dev helper: Simulate success
              </button>
            </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {clientSecret && stripePromise && StripeReact && (
              <div className="mt-8 pt-8 border-t border-gray-100">
                <StripeReact.Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm bookingId={bookingId as string} />
                </StripeReact.Elements>
              </div>
            )}

            {clientSecret && !stripePromise && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-sm italic">
                Stripe client libraries not available. Please use the simulation button for development.
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-[#5f6368] text-sm">
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure Transaction
            </div>
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              SSL Encrypted
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CheckoutForm({ bookingId }: { bookingId: string }) {
  let useStripeFn, useElementsFn, PaymentElementComp;
  try {
    const rs = require('@stripe/react-stripe-js');
    useStripeFn = rs.useStripe;
    useElementsFn = rs.useElements;
    PaymentElementComp = rs.PaymentElement;
  } catch (e) {
    return <div className="text-red-500">Stripe components not available.</div>;
  }

  const stripe = useStripeFn();
  const elements = useElementsFn();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handlePay = async () => {
    if (!stripe || !elements) return setError('Stripe not ready');
    setLoading(true);
    setError('');
    try {
      const res: any = await stripe.confirmPayment({ elements, confirmParams: { return_url: window.location.origin + '/calendar' } });
      if (res.error) {
        setError(res.error.message || 'Payment failed');
      } else {
        window.location.href = '/calendar';
      }
    } catch (e: any) {
      setError(e.message || 'Payment error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PaymentElementComp className="mb-4" />
      <button 
        onClick={handlePay} 
        className="btn btn-primary w-full py-4 text-lg" 
        disabled={loading || !stripe}
      >
        {loading ? 'Processing Payment...' : 'Pay Deposit Now'}
      </button>
      {error && <div className="text-red-500 text-sm font-medium mt-2">{error}</div>}
    </div>
  );
}
