import React, { useState, useEffect } from 'react';

type Props = {
  open: boolean;
  start?: string;
  end?: string;
  onClose: () => void;
  onSubmit: (payload: { start: string; end: string; name: string; email: string }) => Promise<void>;
};

export default function BookingModal({ open, start, end, onClose, onSubmit }: Props) {
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
