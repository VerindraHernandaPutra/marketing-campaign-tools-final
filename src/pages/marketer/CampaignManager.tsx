import React from 'react';
import { Container, Title, Group, Button, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import PageShell from '../../shared/PageShell';
import CampaignHistory from '../../campaign/CampaignHistory';

const CampaignManager: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageShell>
      <Container size="xl" p={0}>
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={3}>Campaigns</Title>
            <Text c="dimmed" size="sm">Manage and track your marketing efforts</Text>
          </div>
          <Button
            size="xs"
            leftSection={<PlusIcon size={14} />}
            onClick={() => navigate('/campaign-manager/new')}
          >
            Create Campaign
          </Button>
        </Group>
        <CampaignHistory />
      </Container>
    </PageShell>
  );
};

export default CampaignManager;
