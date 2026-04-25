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
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal !p-0 !max-w-2xl !rounded-[32px] overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)]">
        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
          {/* Sidebar Info */}
          <div className="md:col-span-2 bg-black p-10 text-white flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 overflow-hidden rounded-xl flex items-center justify-center mb-10">
                <img src="/tree4fivelogo.png" alt="bestflats.vip logo" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-4">Confirm Stay</h2>
              <p className="text-gray-400 font-medium text-sm leading-relaxed mb-10">
                You're one step away from securing your exceptional experience at {apartment?.name || 'this property'}.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs">✓</div>
                  <span className="text-xs font-black uppercase tracking-widest">Instant Confirmation</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs">✓</div>
                  <span className="text-xs font-black uppercase tracking-widest">Digital Keys</span>
                </div>
              </div>
            </div>
            
            <div className="pt-10 border-t border-white/10 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Secured by bestflats.vip
            </div>
          </div>

          {/* Form Content */}
          <div className="md:col-span-3 p-10 bg-white">
            <div className="flex justify-end mb-4">
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-8">
              {/* Date Selection Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-in</p>
                  <p className="text-sm font-extrabold text-gray-900">{formatDate(start)}</p>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-out</p>
                  <p className="text-sm font-extrabold text-gray-900">{formatDate(end)}</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Guest Identity</label>
                  <input 
                    type="text"
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full legal name"
                    className="input !bg-gray-50 !border-transparent focus:!bg-white focus:!border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email for Keys</label>
                  <input 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@prestige.com"
                    className="input !bg-gray-50 !border-transparent focus:!bg-white focus:!border-black"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-3">
                  <span className="text-lg">⚠️</span>
                  {error}
                </div>
              )}

              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={async () => {
                    if (!name.trim()) {
                      setError('Identity verification required');
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
                      setError(err?.message || 'Verification failed');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !name.trim()}
                  className="btn btn-luxury w-full py-5 text-lg font-black"
                >
                  {loading ? 'Processing...' : 'Confirm Privilege'}
                </button>
                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                  By confirming, you agree to our house rules
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
