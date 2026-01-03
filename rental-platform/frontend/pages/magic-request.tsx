import React, { useState } from 'react';
import axios from 'axios';

export default function MagicRequest() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) return alert('Email required');
    try {
      await axios.post('http://localhost:4000/auth/magic', { email, redirectUrl: window.location.origin + '/magic-callback' });
      setSent(true);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Get a magic sign-in link</h1>
      {sent ? (
        <div>A sign-in link was sent to your email (or logged to console in dev).</div>
      ) : (
        <div style={{ maxWidth: 420 }}>
          <input placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 8 }} />
          <button onClick={handleSend} style={{ marginTop: 8 }}>Send me a sign-in link</button>
        </div>
      )}
    </div>
  );
}
