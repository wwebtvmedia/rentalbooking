import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function MagicCallback() {
  const router = useRouter();

  useEffect(() => {
    const doVerify = async () => {
      const token = router.query.token as string | undefined;
      if (!token) return;
      try {
        const res = await axios.post('http://localhost:4000/auth/magic/verify', { token });
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('guest', JSON.stringify(res.data.user));
          router.push('/');
        }
      } catch (err: any) {
        alert(err.response?.data?.error || err.message);
      }
    };
    doVerify();
  }, [router]);

  return <div style={{ padding: 20 }}>Verifying sign-in link...</div>;
}
