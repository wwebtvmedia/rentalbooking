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

  const fetchEvents = async (start?: string, end?: string) => {
    const params: any = {};
    if (apartmentId) params.apartmentId = apartmentId;
    if (start) params.from = start;
    if (end) params.to = end;
    const res = await axios.get('http://localhost:4000/calendar/events', { params });
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
      await axios.post('http://localhost:4000/bookings', {
        fullName: payload.name,
        email: payload.email,
        apartmentId,
        start: payload.start,
        end: payload.end
      }, { headers });
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
    if (ext.type === 'availability') {
      // admins can delete blocked slots via prompt
      const token = window.prompt('Admin token to modify slot (leave blank to cancel)');
      if (!token) return;
      try {
        await axios.delete(`http://localhost:4000/availabilities/${ext.availId}`, {
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
        await axios.post(`http://localhost:4000/bookings/${ext.bookingId}/cancel`, {}, { headers });
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
        onClose={() => setModalOpen(false)}
        onSubmit={createBooking}
      />
    </div>
  );
};

export default CalendarPage;
