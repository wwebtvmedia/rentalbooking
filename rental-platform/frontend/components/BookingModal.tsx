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
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Complete Your Booking</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Date Range Display */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-600 mb-2"><strong>Check-in:</strong></p>
            <p className="text-blue-900 font-semibold text-sm mb-3">{formatDate(start)}</p>
            <p className="text-sm text-gray-600 mb-2"><strong>Check-out:</strong></p>
            <p className="text-blue-900 font-semibold text-sm">{formatDate(end)}</p>
          </div>

          {/* Apartment Info */}
          {apartment && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {apartment.photos && apartment.photos.length > 0 && (
                <img src={apartment.photos[0]} alt={apartment.name} className="w-full h-32 object-cover rounded-lg mb-3" />
              )}
              <h3 className="font-bold text-gray-900 mb-2">{apartment.name}</h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{apartment.description}</p>
              <div className="text-blue-600 font-bold text-lg">${apartment.pricePerNight || 'TBD'}/night</div>
            </div>
          )}

          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input 
              type="text"
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-900 text-sm font-semibold">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 bg-gray-50">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition"
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
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
          >
            {loading ? '⏳ Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
