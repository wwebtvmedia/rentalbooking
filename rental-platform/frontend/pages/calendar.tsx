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
      
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await axios.get(`${base}/calendar/events`, { params });
      setEvents(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apartmentId) fetchEvents();
  }, [apartmentId]);

  const handleDateSelect = async (selectInfo: any) => {
    setModalRange({ start: selectInfo.start.toISOString(), end: selectInfo.end?.toISOString() });
    setModalOpen(true);
  };

  async function createBooking(payload: { start: string; end: string; name: string; email: string }) {
    try {
      const token = localStorage.getItem('token');
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const resp = await axios.post(`${base}/bookings`, {
        fullName: payload.name,
        email: payload.email,
        apartmentId,
        start: payload.start,
        end: payload.end
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      
      if (resp.data.depositAmount > 0) {
        window.location.href = `/payments/${resp.data._id}`;
        return;
      }
      setToast('Booking Confirmed');
      fetchEvents();
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setToast(err.response?.data?.error || err.message);
      throw err;
    }
  }

  return (
    <div className="fade-in-up">
      <Head>
        <title>Availability | dreamflat</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      
      <div className="min-h-screen bg-white">
        <header className="site-header">
          <div className="container flex justify-between items-center w-full">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-12 h-12 overflow-hidden rounded-lg">
                <img src="/tree4fivelogo.png" alt="logo" className="w-full h-full object-cover" />
              </div>
              <span className="brand-text">dreamflat</span>
            </Link>
            <button onClick={() => router.back()} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition">
              ← Return
            </button>
          </div>
        </header>

        <main className="container py-24">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 text-center">
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-black uppercase">Schedule Your Stay</h1>
              <p className="text-gray-400 font-bold uppercase text-[11px] tracking-[0.4em]">Property: {apartment?.name || 'Loading Residence...'}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-8">
                <div className="luxury-card !p-12 !rounded-3xl shadow-2xl bg-white border-none ring-1 ring-gray-100">
                  <div className="calendar-container">
                    <FullCalendar
                      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                      initialView="dayGridMonth"
                      headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth' }}
                      selectable={true}
                      selectMirror={true}
                      select={handleDateSelect}
                      events={events}
                      ref={calendarRef}
                      height="auto"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-12">
                <div className="p-10 bg-black text-white rounded-3xl shadow-2xl">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gold mb-8 text-center">Quick Booking</h3>
                  <button 
                    onClick={() => { 
                      setModalRange({ start: new Date().toISOString(), end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() }); 
                      setModalOpen(true); 
                    }} 
                    className="btn btn-gold w-full !py-6 text-[11px] font-black tracking-[0.2em]"
                  >
                    Custom Request
                  </button>
                </div>

                <div className="p-10 bg-gray-50 rounded-3xl border border-gray-100">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 mb-8">Legend</h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-5">
                      <div className="w-4 h-4 bg-[#3788d8] rounded-sm" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Available Slots</span>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="w-4 h-4 bg-[#ff9f89] rounded-sm" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Reserved</span>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="w-4 h-4 bg-[#ef4444] rounded-sm" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Fully Occupied</span>
                    </div>
                  </div>
                </div>
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
        .fc .fc-toolbar-title { font-weight: 900; font-size: 1.25rem; letter-spacing: 0.1em; text-transform: uppercase; }
        .fc .fc-col-header-cell-cushion { font-weight: 800; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.2em; color: #9aa0a6; padding: 20px 0; }
        .fc-daygrid-day-number { font-weight: 700; font-size: 0.75rem; padding: 12px !important; }
        .fc-button-primary:disabled { background-color: #000 !important; border-color: #000 !important; opacity: 1 !important; }
      `}</style>
    </div>
  );
};

export default CalendarPage;
