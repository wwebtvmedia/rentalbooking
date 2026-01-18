import Link from 'next/link';
import Image from 'next/image';
import logo from '../styles/tree4fivelogo.png';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Header() {
  const router = useRouter();
  const { apartmentId } = router.query;
  const [selected, setSelected] = useState<string>((apartmentId as string) || '');

  useEffect(() => {
    if (apartmentId) setSelected(apartmentId as string);
  }, [apartmentId]);

  // Theme state: light | dark. Initialize to 'light' and then sync with user preference/localStorage
  const [theme, setTheme] = useState<'light'|'dark'>('light');

  useEffect(() => {
    // Run only on client
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved as 'dark' | 'light');
        document.documentElement.setAttribute('data-theme', saved);
        return;
      }
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    } catch (e) {
      // ignore (SSR safety)
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    } catch (e) {}
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setSelected(val);
    const query = { ...router.query };
    if (val) query.apartmentId = val;
    else delete query.apartmentId;
    router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  }

  return (
    <header className="site-header">
      <div className="site-header-inner container">
        <h1 className="brand">
          <Image src={logo} alt="Tree4Five" width={40} height={40} className="logo" />
          <span className="brand-text">Rental Platform</span>
        </h1>
        <nav className="nav">
          <select value={selected} onChange={onChange} aria-label="Select apartment">
            <option value="">All apartments</option>
            <option value="1">Apartment 1</option>
            <option value="2">Apartment 2</option>
            <option value="3">Apartment 3</option>
          </select>
          <Link href="/apartment">Apartment</Link>
          <Link href="/magic-request" className="login">Log in</Link>
          <button role="switch" aria-pressed={theme === 'dark'} aria-label="Toggle theme" className="theme-toggle" onClick={toggleTheme}>{theme === 'dark' ? '🌙' : '☀️'}</button>
        </nav>
      </div>
    </header>
  );
}
