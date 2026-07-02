import React, { useEffect, useState, useCallback } from 'react';
import { Paper, Box, Loader } from '@mantine/core';
import FullCalendar from '@fullcalendar/react';
import type { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/useAuth';
import { useNavigate } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor?: string;
  borderColor?: string;
  allDay?: boolean;
  extendedProps?: {
    platforms?: string[];
    status?: string;
    type?: 'campaign' | 'holiday';
  };
}

const ScheduledCalendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const getPlatformColor = (platforms: string[]) => {
    if (platforms.includes('whatsapp')) return '#25D366';
    if (platforms.includes('instagram')) return '#E4405F';
    if (platforms.includes('facebook')) return '#1877F2';
    if (platforms.includes('email')) return '#EA4335';
    if (platforms.includes('twitter')) return '#1DA1F2';
    return '#888888';
  };

  const fetchHolidays = async (year: number) => {
    try {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`);
      if (!response.ok) throw new Error('Failed to fetch holidays');
      const data = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((holiday: any) => ({
        id: `holiday-${holiday.date}-${holiday.name}`,
        title: `🎉 ${holiday.name}`,
        start: holiday.date,
        allDay: true,
        backgroundColor: '#FFC107',
        borderColor: '#FFC107',
        extendedProps: { type: 'holiday', status: 'holiday' },
      }));
    } catch (e) {
      console.error('Error fetching holidays:', e);
      return [];
    }
  };

  const loadAllEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: campaignData, error } = await supabase
        .from('marketing_campaigns')
        .select('id, title, scheduled_date, platforms, status')
        .eq('user_id', user.id)
        .not('scheduled_date', 'is', null);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const campaignEvents: CalendarEvent[] = (campaignData || []).map((campaign: any) => ({
        id: campaign.id,
        title: `${campaign.title} (${campaign.platforms?.[0] || 'General'})`,
        start: campaign.scheduled_date,
        backgroundColor: getPlatformColor(campaign.platforms || []),
        borderColor: getPlatformColor(campaign.platforms || []),
        extendedProps: {
          platforms: campaign.platforms,
          status: campaign.status,
          type: 'campaign',
        },
      }));

      const currentYear = new Date().getFullYear();
      const holidaysCurrent = await fetchHolidays(currentYear);
      const holidaysNext = await fetchHolidays(currentYear + 1);

      setEvents([...campaignEvents, ...holidaysCurrent, ...holidaysNext]);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllEvents();
  }, [loadAllEvents]);

  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps.type === 'campaign') {
      navigate(`/campaign-manager/edit/${info.event.id}`);
    }
  };

  if (loading) {
    return (
      <Paper shadow="sm" p="xl" style={{ minHeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="xl">
      <style>{`
        .sunday-cell {
          background-color: rgba(255, 0, 0, 0.05) !important;
        }
        .fc-event[style*="background-color: rgb(255, 193, 7)"] {
          cursor: default;
        }
      `}</style>
      <Box className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          selectable={true}
          dayCellClassNames={(arg) => {
            if (arg.date.getDay() === 0) return ['sunday-cell'];
            return [];
          }}
        />
      </Box>
    </Paper>
  );
};

export default ScheduledCalendar;
