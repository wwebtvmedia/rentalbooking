import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function PaymentPage() {
  const router = useRouter();
  const { bookingId } = router.query;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await axios.get(`${base}/bookings/${bookingId}`);
        setBooking(res.data);
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
      const r = await axios.post(`${base}/payments/create-intent`, { bookingId });
      setClientSecret(r.data.clientSecret || null);

      // Try to dynamically import Stripe client libs and initialize
      if (r.data.clientSecret && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        try {
          const stripeJs = await import('@stripe/stripe-js');
          const reactStripe = await import('@stripe/react-stripe-js');
          const p = stripeJs.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);
          setStripePromise(p);
          setStripeReact(reactStripe);
        } catch (e) {
          console.warn('Stripe client libs not available; falling back to simulate button', e);
        }
      }
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
      await axios.post(`${base}/payments/${bookingId}/simulate-success`);
      alert('Simulated payment success');
      router.push('/calendar');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!bookingId) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Complete deposit for booking</h1>
      {booking && (
        <div>
          <div><strong>Name:</strong> {booking.fullName}</div>
          <div><strong>Dates:</strong> {new Date(booking.start).toLocaleString()} - {new Date(booking.end).toLocaleString()}</div>
          <div><strong>Deposit:</strong> ${booking.depositAmount ? (booking.depositAmount / 100).toFixed(2) : '0.00'}</div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button onClick={startPayment} disabled={loading || !booking || !booking.depositAmount} className="button primary">Start payment</button>
        <button onClick={simulateSuccess} disabled={loading} className="button secondary" style={{ marginLeft: 8 }}>Simulate success (dev)</button>
      </div>
      {error && <div style={{ marginTop: 12, color: 'red' }}>{error}</div>}
      {clientSecret && stripePromise && StripeReact && (
        <div style={{ marginTop: 12 }}>
          {/* Render Stripe Elements with PaymentElement */}
          <StripeReact.Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm bookingId={bookingId as string} />
          </StripeReact.Elements>
        </div>
      )}
      {clientSecret && !stripePromise && (
        <div style={{ marginTop: 12 }}>
          <div>Stripe client libraries not available in this environment. Use the "Simulate success" button to complete dev/test flows.</div>
        </div>
      )}
    </div>
  );
}

function CheckoutForm({ bookingId }: { bookingId: string }) {
  // require react-stripe-js hooks (available when stripe libs loaded)
  let useStripeFn, useElementsFn, PaymentElementComp;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const rs = require('@stripe/react-stripe-js');
    useStripeFn = rs.useStripe;
    useElementsFn = rs.useElements;
    PaymentElementComp = rs.PaymentElement;
  } catch (e) {
    return <div>Stripe components not available in this environment.</div>;
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
        // success or pending capture
        window.location.href = '/calendar';
      }
    } catch (e: any) {
      setError(e.message || 'Payment error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginTop: 12 }}>
        {/* @ts-ignore */}
        <PaymentElementComp />
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={handlePay} className="button primary" disabled={loading}>{loading ? 'Processing...' : 'Pay deposit'}</button>
      </div>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </div>
  );
}