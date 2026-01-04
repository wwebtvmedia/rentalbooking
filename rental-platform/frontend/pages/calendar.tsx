import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import axios from 'axios';
import BookingModal from '../components/BookingModal';

const CalendarPage = () => {
  const calendarRef = useRef<any>(null);
  const [events, setEvents] = useState<any[]>([]);
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
        setApartment(null);
      }
    };
    fetchApartment();
  }, [apartmentId]);
  const fetchEvents = async (start?: string, end?: string) => {
    const params: any = {};
    if (apartmentId) params.apartmentId = apartmentId;
    if (start) params.from = start;
    if (end) params.to = end;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const res = await axios.get(`${base}/calendar/events`, { params });
    setEvents(res.data);
  };

  useEffect(() => {
    // re-fetch when apartmentId becomes available
    fetchEvents();
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
            await axios.post(`http://localhost:4000/bookings/${ext.bookingId}/cancel`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
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
    <div className="container">
      <h1>Calendar</h1>
      <div className="calendar-toolbar">
        <button onClick={() => { setModalRange({ start: new Date().toISOString(), end: new Date(Date.now() + 60 * 60 * 1000).toISOString() }); setModalOpen(true); }} className="button">New booking</button>
        {toast && <div className="toast">{toast}</div>}
      </div>
      <div className="calendar-wrap" style={{ maxWidth: '900px' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }}
          selectable={true}
          selectMirror={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          events={events}
          ref={calendarRef}
          height="auto"
        />
      </div>
      <BookingModal
        open={modalOpen}
        start={modalRange.start}
        end={modalRange.end}
        apartment={apartment}
        onClose={() => setModalOpen(false)}
        onSubmit={createBooking}
      />
    </div>
  );
};

export default CalendarPage;
