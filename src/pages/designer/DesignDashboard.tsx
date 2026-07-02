import React from 'react';
import PageShell from '../../shared/PageShell';
import DashboardContent from '../../dashboard/DashboardContent';
import usePageTitle from '../../hooks/usePageTitle';

const DesignDashboard: React.FC = () => {
  usePageTitle('Design Dashboard');
  return (
    <PageShell>
      <DashboardContent />
    </PageShell>
  );
};

export default DesignDashboard;
