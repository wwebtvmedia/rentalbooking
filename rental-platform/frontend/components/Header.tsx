import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Header() {
  const router = useRouter();
  const { apartmentId } = router.query;
  const [selected, setSelected] = useState<string>((apartmentId as string) || '');

  useEffect(() => {
    if (apartmentId) setSelected(apartmentId as string);
  }, [apartmentId]);

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
        <h1 className="brand">Rental Platform</h1>
        <nav className="nav">
          <select value={selected} onChange={onChange} aria-label="Select apartment">
            <option value="">All apartments</option>
            <option value="1">Apartment 1</option>
            <option value="2">Apartment 2</option>
            <option value="3">Apartment 3</option>
          </select>
          <Link href="/magic-request"><a className="login">Log in</a></Link>
        </nav>
      </div>
    </header>
  );
}
