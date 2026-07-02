import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { RoleGuard } from './auth/RoleGuard';

const Profile             = lazy(() => import('./pages/Profile'));
const LoginPage           = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const Dashboard           = lazy(() => import('./pages/Dashboard'));
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'));
const OrganizationDetails = lazy(() => import('./pages/admin/OrganizationDetails'));
const Groups   = lazy(() => import('./pages/marketer/Groups'));
const Clients  = lazy(() => import('./pages/marketer/Clients'));
const DesignDashboard = lazy(() => import('./pages/designer/DesignDashboard'));
const Projects        = lazy(() => import('./pages/designer/Projects'));
const Templates       = lazy(() => import('./pages/designer/Templates'));
const CanvaEditor     = lazy(() => import('./editor/CanvaEditor'));
const Campaigns       = lazy(() => import('./pages/marketer/Campaigns'));
const CampaignManager = lazy(() => import('./pages/marketer/CampaignManager'));
const CampaignCreate  = lazy(() => import('./pages/marketer/CampaignCreate'));
const Analytics       = lazy(() => import('./pages/marketer/Analytics'));
const Inbox           = lazy(() => import('./pages/marketer/Inbox'));
const ScheduledPosts          = lazy(() => import('./pages/marketer/ScheduledPosts'));
const IntegrationsMeta        = lazy(() => import('./pages/marketer/IntegrationsMeta'));
const IntegrationsResend      = lazy(() => import('./pages/marketer/IntegrationsResend'));
const IntegrationsWhatsApp    = lazy(() => import('./pages/marketer/IntegrationsWhatsApp'));
const MetaOAuthCallback    = lazy(() => import('./pages/MetaOAuthCallback'));
const WaTemplates          = lazy(() => import('./pages/marketer/WaTemplates'));


const PageLoader = () => (
  <Center h="100vh"><Loader size="sm" color="blue" /></Center>
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/integrations/meta-callback" element={<MetaOAuthCallback />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />

            {/* SUPER ADMIN */}
            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/organization/:orgId" element={<OrganizationDetails />} />
            </Route>
          </Route>

          {/* OPERATOR */}
          <Route element={<RoleGuard allowedRoles={['operator']} />}>
            <Route path="/groups" element={<Groups />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/organization/users" element={<OrganizationDetails />} />
          </Route>

          {/* DESIGNER & OPERATOR */}
          <Route element={<RoleGuard allowedRoles={['designer', 'operator']} />}>
            <Route path="/design-dashboard" element={<DesignDashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/editor/:projectId" element={<CanvaEditor />} />
          </Route>

          {/* CAMPAIGN DESIGNS — marketer, operator, designer (designer: view & edit only) */}
          <Route element={<RoleGuard allowedRoles={['marketer', 'operator', 'designer']} />}>
            <Route path="/campaigns" element={<Campaigns />} />
          </Route>

          {/* MARKETER & OPERATOR */}
          <Route element={<RoleGuard allowedRoles={['marketer', 'operator']} />}>
            <Route path="/campaign-manager" element={<CampaignManager />} />
            <Route path="/campaign-manager/new" element={<CampaignCreate />} />
            <Route path="/campaign-manager/edit/:campaignId" element={<CampaignCreate />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/scheduled-posts" element={<ScheduledPosts />} />
            <Route path="/integrations/meta" element={<IntegrationsMeta />} />
            <Route path="/integrations/resend" element={<IntegrationsResend />} />
            <Route path="/integrations/whatsapp" element={<IntegrationsWhatsApp />} />
            <Route path="/wa-templates" element={<WaTemplates />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
