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
        <title>Select Dates - dreamflat</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <div className="min-h-screen bg-[#f8f9fa]">
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="flex items-center">
              <span className="text-2xl mr-2">🏠</span>
              <span className="brand-text">dreamflat</span>
            </Link>
            <button 
              onClick={() => router.back()}
              className="btn btn-outline text-xs py-1 px-3"
            >
              ← Back
            </button>
          </div>
        </header>

        <main className="container py-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#202124]">Select your dates</h1>
              {apartment && (
                <p className="text-[#5f6368] mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Booking for: <span className="font-medium text-[#202124]">{apartment.name}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="card p-6">
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

              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="font-bold text-[#202124] mb-4">Quick Actions</h3>
                  <button 
                    onClick={() => { 
                      setModalRange({ 
                        start: new Date().toISOString(), 
                        end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() 
                      }); 
                      setModalOpen(true); 
                    }} 
                    className="btn btn-primary w-full py-3 mb-3"
                  >
                    + Create custom booking
                  </button>
                  <p className="text-xs text-[#5f6368] text-center">
                    Tip: You can also click and drag directly on the calendar to select dates.
                  </p>
                </div>

                <div className="card p-6">
                  <h3 className="font-bold text-[#202124] mb-4">Legend</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-[#3788d8] rounded"></div>
                      <span className="text-sm text-[#5f6368]">Available slots</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-[#ff9f89] rounded"></div>
                      <span className="text-sm text-[#5f6368]">Your bookings</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-[#ef4444] rounded"></div>
                      <span className="text-sm text-[#5f6368]">Unavailable / Blocked</span>
                    </div>
                  </div>
                </div>

                {toast && (
                  <div className="p-4 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm flex items-center gap-2 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {toast}
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
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
    </>
  );
};

export default CalendarPage;
