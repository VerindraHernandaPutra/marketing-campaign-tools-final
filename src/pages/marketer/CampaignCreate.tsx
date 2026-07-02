import React from 'react';
import { Container, Title, Group, Button, Box } from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import PageShell from '../../shared/PageShell';
import CampaignForm from '../../campaign/CampaignForm';

const CampaignCreate: React.FC = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams();

  return (
    <PageShell>
      <Container size="xl" p={0}>
        <Box mb="lg">
          <Group mb="sm">
            <Button variant="subtle" size="sm" leftSection={<ArrowLeftIcon size={16} />}
              onClick={() => navigate('/campaign-manager')}>
              Back to Campaigns
            </Button>
          </Group>
          <Title order={2}>
            {campaignId ? 'Edit Campaign' : 'Create New Campaign'}
          </Title>
        </Box>
        <CampaignForm />
      </Container>
    </PageShell>
  );
};

export default CampaignCreate;
