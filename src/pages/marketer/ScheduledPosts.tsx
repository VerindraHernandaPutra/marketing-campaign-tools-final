import React, { useState, lazy, Suspense } from 'react';
import { Box, Tabs, Center, Loader, Button } from '@mantine/core';
import { CalendarDaysIcon, ListIcon, PlusIcon, RocketIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../../shared/PageShell';
import PageHeader from '../../shared/PageHeader';
import ScheduledList from '../../scheduled/ScheduledList';

const ScheduledCalendar = lazy(() => import('../../scheduled/ScheduledCalendar'));

const ScheduledPosts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('history');
  const navigate = useNavigate();

  return (
    <PageShell>
      <Box>
        <PageHeader
          icon={<RocketIcon size={22} />}
          title="Campaigns"
          subtitle="Track, review and manage all your past and upcoming campaigns"
          gradient={{ from: 'indigo', to: 'cyan' }}
          action={
            <Button
              leftSection={<PlusIcon size={16} />}
              variant="gradient"
              gradient={{ from: 'indigo', to: 'cyan' }}
              onClick={() => navigate('/campaign-manager/new')}
            >
              New Campaign
            </Button>
          }
        />

        <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
          <Tabs.List mb="xl">
            <Tabs.Tab value="history" leftSection={<ListIcon size={15} />}>
              History & All Campaigns
            </Tabs.Tab>
            <Tabs.Tab value="calendar" leftSection={<CalendarDaysIcon size={15} />}>
              Calendar View
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="history">
            <ScheduledList />
          </Tabs.Panel>

          <Tabs.Panel value="calendar">
            <Suspense fallback={<Center h={300}><Loader size="sm" color="blue" /></Center>}>
              {activeTab === 'calendar' && <ScheduledCalendar />}
            </Suspense>
          </Tabs.Panel>
        </Tabs>
      </Box>
    </PageShell>
  );
};

export default ScheduledPosts;
