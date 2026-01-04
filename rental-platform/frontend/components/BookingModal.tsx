import React, { useState, useEffect } from 'react';

type Props = {
  open: boolean;
  start?: string;
  end?: string;
  apartment?: any;
  onClose: () => void;
  onSubmit: (payload: { start: string; end: string; name: string; email: string }) => Promise<void>;
};

export default function BookingModal({ open, start, end, apartment, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setEmail('');
      setError('');
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Create booking</h2>
        <p>
          <strong>Start:</strong> {start} <br />
          <strong>End:</strong> {end}
        </p>
        {apartment && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            {apartment.photos && apartment.photos.length > 0 && <img src={apartment.photos[0]} alt="photo" style={{ width: 120, height: 80, objectFit: 'cover' }} />}
            <div>
              <div><strong>{apartment.name}</strong></div>
              <div>{apartment.description}</div>
              <div style={{ marginTop: 6 }}><strong>Price/night:</strong> ${apartment.pricePerNight}</div>
              {apartment.rules && <div style={{ marginTop: 6 }}><strong>Rules:</strong> {apartment.rules}</div>}
            </div>
          </div>
        )}
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button onClick={onClose} className="button secondary">Cancel</button>
          <button
            className="button primary"
            disabled={loading || name.trim() === ''}
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                await onSubmit({ start: start || '', end: end || '', name, email: email || 'noreply@example.com' });
                onClose();
              } catch (err: any) {
                setError(err?.message || 'Failed to create booking');
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Saving...' : 'Create booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
