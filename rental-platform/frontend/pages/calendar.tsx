import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import axios from 'axios';
import BookingModal from '../components/BookingModal';
import Link from 'next/link';

const CalendarPage = () => {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const apartmentId = router.query.apartmentId as string | undefined;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRange, setModalRange] = useState<{ start?: string; end?: string }>({});
  const [toast, setToast] = useState<string | null>(null);
  const [apartment, setApartment] = useState<any>(null);

  useEffect(() => {
    const fetchApartment = async () => {
      if (!apartmentId) return setApartment(null);
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await axios.get(`${base}/apartments/${apartmentId}`);
        setApartment(res.data);
      } catch (err) {
        console.error('Failed to fetch apartment:', err);
        setApartment(null);
      }
    };
    fetchApartment();
  }, [apartmentId]);

  const fetchEvents = async (start?: string, end?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (apartmentId) params.apartmentId = apartmentId;
      if (start) params.from = start;
      if (end) params.to = end;
      
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await axios.get(`${base}/calendar/events`, { params });
      setEvents(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch calendar events:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load calendar events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apartmentId) {
      fetchEvents();
    }
  }, [apartmentId]);

  const handleDateSelect = async (selectInfo: any) => {
    setModalRange({ start: selectInfo.start.toISOString(), end: selectInfo.end?.toISOString() });
    setModalOpen(true);
  };

  async function createBooking(payload: { start: string; end: string; name: string; email: string }) {
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const resp = await axios.post(`${base}/bookings`, {
        fullName: payload.name,
        email: payload.email,
        apartmentId,
        start: payload.start,
        end: payload.end
      }, { headers });
      const booking = resp.data;
      if (booking.depositAmount && booking.depositAmount > 0) {
        window.location.href = `/payments/${booking._id}`;
        return;
      }
      setToast('Booking created successfully');
      fetchEvents();
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setToast(err.response?.data?.error || err.message || 'Failed to create booking');
      setTimeout(() => setToast(null), 5000);
      throw err;
    }
  }

  const handleEventClick = async (clickInfo: any) => {
    const ext = clickInfo.event.extendedProps;
    if (ext.apartment) {
      const apt = ext.apartment;
      const info = `${apt.name}\nPrice/night: $${apt.pricePerNight || 0}\n${apt.description || ''}`;
      if (apt.lat && apt.lon) {
        if (window.confirm(info + '\n\nOpen location in maps?')) {
          window.open(`https://www.openstreetmap.org/?mlat=${apt.lat}&mlon=${apt.lon}`,'_blank');
        }
      } else {
        alert(info);
      }
    }

    if (ext.type === 'availability') {
      const token = window.prompt('Admin token to modify slot');
      if (!token) return;
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        await axios.delete(`${base}/availabilities/${ext.availId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Availability removed');
        fetchEvents();
      } catch (err: any) {
        alert(err.response?.data?.error || err.message);
      }
    } else if (ext.type === 'booking') {
      const c = window.confirm('Cancel this booking?');
      if (!c) return;
      try {
        const token = localStorage.getItem('token');
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        await axios.post(`${base}/bookings/${ext.bookingId}/cancel`, {}, { headers });
        alert('Booking cancelled');
        fetchEvents();
      } catch (err: any) {
        if (err.response?.status === 403) {
          const adminToken = window.prompt('Admin token to cancel');
          if (!adminToken) return;
          try {
            const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
            await axios.post(`${base}/bookings/${ext.bookingId}/cancel`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
            alert('Booking cancelled by admin');
            fetchEvents();
          } catch (err2: any) {
            alert(err2.response?.data?.error || err2.message);
          }
        } else {
          alert(err.response?.data?.error || err.message);
        }
      }
    }
  };

  return (
    <>
      <Head>
        <title>Select Dates | dreamflat</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <div className="min-h-screen bg-[#fdfdfd]">
        <header className="site-header">
          <div className="container flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 overflow-hidden rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <img src="/tree4fivelogo.png" alt="dreamflat logo" className="w-full h-full object-cover" />
              </div>
              <span className="brand-text">dreamflat</span>
            </Link>
            <button 
              onClick={() => router.back()}
              className="btn btn-outline border-none text-gray-500 hover:text-black"
            >
              ← Back to Residence
            </button>
          </div>
        </header>

        <main className="container py-16">
          <div className="max-w-6xl mx-auto">
            <div className="mb-12 animate-fade-in">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Reserve your stay</h1>
              {apartment && (
                <div className="flex items-center gap-3 p-4 bg-black rounded-2xl w-fit">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <span className="text-sm font-black text-white uppercase tracking-widest">Property: {apartment.name}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 animate-fade-in">
                <div className="card !p-8 !rounded-[32px] border-none shadow-2xl bg-white ring-1 ring-gray-100">
                  <div className="calendar-container">
                    <FullCalendar
                      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
                      selectable={true}
                      selectMirror={true}
                      select={handleDateSelect}
                      eventClick={handleEventClick}
                      events={events}
                      ref={calendarRef}
                      height="auto"
                      themeSystem="standard"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="card !p-8 !rounded-[32px] border-none shadow-xl bg-white ring-1 ring-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">Booking Info</h3>
                  <button 
                    onClick={() => { 
                      setModalRange({ 
                        start: new Date().toISOString(), 
                        end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() 
                      }); 
                      setModalOpen(true); 
                    }} 
                    className="btn btn-luxury w-full py-5 mb-6 text-lg font-black"
                  >
                    Custom Request
                  </button>
                  <p className="text-xs text-gray-400 font-bold text-center leading-relaxed">
                    Select dates directly on the calendar to begin your reservation process.
                  </p>
                </div>

                <div className="card !p-8 !rounded-[32px] border-none shadow-xl bg-white ring-1 ring-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">Availability Legend</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 bg-[#3788d8] rounded-lg shadow-sm"></div>
                      <span className="text-sm font-bold text-gray-600 uppercase tracking-widest">Available</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 bg-[#ff9f89] rounded-lg shadow-sm"></div>
                      <span className="text-sm font-bold text-gray-600 uppercase tracking-widest">Confirmed</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 bg-[#ef4444] rounded-lg shadow-sm"></div>
                      <span className="text-sm font-bold text-gray-600 uppercase tracking-widest">Reserved</span>
                    </div>
                  </div>
                </div>

                {toast && (
                  <div className="p-6 bg-black text-white rounded-[24px] text-sm font-bold flex items-center gap-3 animate-bounce shadow-2xl">
                    <span className="text-xl">✨</span>
                    {toast}
                  </div>
                )}

                {error && (
                  <div className="p-6 bg-red-50 border border-red-100 text-red-700 rounded-[24px] text-sm font-bold flex items-center gap-3 shadow-sm">
                    <span className="text-xl">⚠️</span>
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <BookingModal
        open={modalOpen}
        start={modalRange.start}
        end={modalRange.end}
        apartment={apartment}
        onClose={() => setModalOpen(false)}
        onSubmit={createBooking}
      />

      <style jsx global>{`
        .fc { --fc-border-color: #f1f3f4; --fc-button-bg-color: #000; --fc-button-border-color: #000; --fc-button-hover-bg-color: #333; --fc-button-active-bg-color: #000; }
        .fc .fc-toolbar-title { font-weight: 900; font-size: 1.5rem; letter-spacing: -0.02em; text-transform: uppercase; }
        .fc .fc-col-header-cell-cushion { font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #9aa0a6; padding: 12px 0; }
        .fc-daygrid-day-number { font-weight: 700; font-size: 0.875rem; padding: 8px !important; }
        .fc-button-primary:disabled { background-color: #000 !important; border-color: #000 !important; opacity: 1 !important; }
      `}</style>
    </>
  );
};

export default CalendarPage;
