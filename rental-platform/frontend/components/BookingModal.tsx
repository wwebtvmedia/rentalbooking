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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not selected';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-h-[90vh] overflow-y-auto !max-w-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#202124]">Complete your booking</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Apartment Preview */}
          {apartment && (
            <div className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                <img src={apartment.photos?.[0] || ''} alt={apartment.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-[#202124]">{apartment.name}</h3>
                <p className="text-sm text-[#5f6368] line-clamp-1">{apartment.address}</p>
                <p className="text-blue-600 font-bold mt-1">${apartment.pricePerNight} <span className="text-xs text-gray-500 font-normal">/ night</span></p>
              </div>
            </div>
          )}

          {/* Date Selection Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Check-in</p>
              <p className="text-sm font-medium text-[#202124]">{formatDate(start)}</p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Check-out</p>
              <p className="text-sm font-medium text-[#202124]">{formatDate(end)}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name</label>
              <input 
                type="text"
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button 
            onClick={onClose}
            className="btn btn-outline flex-1 py-3"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!name.trim()) {
                setError('Name is required');
                return;
              }
              setLoading(true);
              setError('');
              try {
                await onSubmit({ 
                  start: start || '', 
                  end: end || '', 
                  name, 
                  email: email || 'noreply@example.com' 
                });
                onClose();
              } catch (err: any) {
                setError(err?.message || 'Failed to create booking');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || !name.trim()}
            className="btn btn-primary flex-1 py-3"
          >
            {loading ? 'Processing...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
