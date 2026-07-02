import React, { useState } from 'react';
import DashboardHeader from '../shared/DashboardHeader';
import DashboardSidebar from '../shared/DashboardSidebar';
import GlobalDashboard from '../shared/GlobalDashboard';

const Dashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      <DashboardSidebar collapsed={collapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DashboardHeader onToggleSidebar={() => setCollapsed(c => !c)} />
        <main id="main-content" style={{ flex: 1, overflowY: 'auto' }}>
          <GlobalDashboard />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
