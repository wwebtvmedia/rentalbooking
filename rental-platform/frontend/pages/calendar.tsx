import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import axios from 'axios';
import BookingModal from '../components/BookingModal';

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
      console.log('Fetching calendar events from:', `${base}/calendar/events`, 'with params:', params);
      
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
    // Only fetch events if apartmentId is available
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
        // redirect to payment page to complete deposit
        window.location.href = `/payments/${booking._id}`;
        return;
      }
      setToast('Booking created');
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

    // show apartment info if available
    if (ext.apartment) {
      const apt = ext.apartment;
      const info = `${apt.name}\nPrice/night: $${apt.pricePerNight || 0}\n${apt.description || ''}\nRules: ${apt.rules || ''}`;
      if (apt.lat && apt.lon) {
        if (window.confirm(info + '\n\nOpen location in maps?')) {
          window.open(`https://www.openstreetmap.org/?mlat=${apt.lat}&mlon=${apt.lon}`,'_blank');
        }
      } else {
        alert(info);
      }
    }

    if (ext.type === 'availability') {
      // admins can delete blocked slots via prompt
      const token = window.prompt('Admin token to modify slot (leave blank to cancel)');
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
        // try cancelling as logged-in guest if token exists
        const token = localStorage.getItem('token');
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        await axios.post(`${base}/bookings/${ext.bookingId}/cancel`, {}, { headers });
        alert('Booking cancelled');
        fetchEvents();
      } catch (err: any) {
        // if failed due to permissions, allow admin token prompt
        if (err.response?.status === 403) {
          const adminToken = window.prompt('Admin token to cancel (leave blank to abort)');
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
        <title>Book Your Dates | Luxury Apartment Rental</title>
        <meta name="description" content="Select your check-in and check-out dates to complete your booking" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Select Your Dates</h1>
              {apartment && (
                <p className="text-gray-600 mt-2">{apartment.name}</p>
              )}
            </div>
            <button 
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-900 text-sm">
            💡 Click on dates to select your check-in and check-out times, or use the "New booking" button to create a custom booking.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => { 
              setModalRange({ 
                start: new Date().toISOString(), 
                end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
              }); 
              setModalOpen(true); 
            }} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition duration-200"
          >
            + New Booking
          </button>
          {apartment && (
            <button 
              onClick={() => router.push(`/apartment?id=${apartment._id || apartment.id}`)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-6 py-3 rounded-lg transition duration-200"
            >
              Back to Apartment
            </button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-900 font-semibold">
            ✓ {toast}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-900 font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-semibold">
            ⏳ Loading calendar events...
          </div>
        )}        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="fc-wrapper" style={{ maxWidth: '100%' }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }}
              selectable={true}
              selectMirror={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              events={events}
              ref={calendarRef}
              height="auto"
              contentHeight="auto"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700 font-medium">Available</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700 font-medium">Your Booking</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-700 font-medium">Unavailable</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      <BookingModal
        open={modalOpen}
        start={modalRange.start}
        end={modalRange.end}
        apartment={apartment}
        onClose={() => setModalOpen(false)}
        onSubmit={createBooking}
      />
      </div>
    </>
  );
};

export default CalendarPage;
