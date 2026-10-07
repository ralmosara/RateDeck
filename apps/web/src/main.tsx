import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext, createRoute, createRouter, RouterProvider, redirect } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ShellProvider } from './shells/ShellContext';
import { ShellLayout } from './shells/ShellLayout';
import { AuthProvider, useAuth } from './shells/AuthContext';
import { Login } from './shells/Login';

import './shared/ui/tokens.css';
import './shared/ui/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

interface RouterContext {
  auth: ReturnType<typeof useAuth>;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => (
    <ShellProvider>
      <ShellLayout>
        <Outlet />
      </ShellLayout>
    </ShellProvider>
  ),
});

import { Dashboard } from './features/reports/Dashboard';

const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: Dashboard,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: Login,
});

import { RateDecksList } from './features/rate-decks/RateDecksList';

const rateDecksRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/rate-decks',
  component: RateDecksList,
});

import { RateDeckDetails } from './features/rate-decks/RateDeckDetails';
import { RateDeckDiff } from './features/rate-decks/RateDeckDiff';
import { RateQuote } from './features/rate-decks/RateQuote';

const rateDeckDetailsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/rate-decks/$id',
  component: RateDeckDetails,
});

const rateDeckDiffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/rate-decks/$id/versions/$versionId',
  component: RateDeckDiff,
});

const rateQuoteRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/rate-quote',
  component: RateQuote,
});

// A catch-all route that just shows the shell so the navigation works during Phase 0
const catchAllRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$',
  component: () => (
    <div style={{ padding: '64px', textAlign: 'center', color: 'var(--rd-color-text-subtle)' }}>
      <p style={{ fontFamily: 'var(--rd-font-mono)', marginBottom: '16px' }}>404 | NOT_IMPLEMENTED</p>
      <p>This route has not been built yet.</p>
    </div>
  ),
});

import { CdrsList } from './features/cdrs/CdrsList';
const cdrsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/cdrs',
  component: CdrsList,
});

import { BillingOverview } from './features/billing/BillingOverview';
const billingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/billing',
  component: BillingOverview,
});

import { WebhooksList } from './features/webhooks/WebhooksList';
const webhooksRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/webhooks',
  component: WebhooksList,
});

import { CarriersList } from './features/carriers/CarriersList';
const carriersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/carriers',
  component: CarriersList,
});

import { ReportsOverview } from './features/reports/ReportsOverview';
const reportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/reports',
  component: ReportsOverview,
});

import { SupportList } from './features/support/SupportList';
const supportRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/support',
  component: SupportList,
});

import { SupportTicket } from './features/support/SupportTicket';
const supportTicketRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/support/$id',
  component: SupportTicket,
});

import { BrandingSettings } from './features/branding/BrandingSettings';
const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: BrandingSettings,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([
    indexRoute, 
    rateDecksRoute, 
    rateDeckDetailsRoute, 
    rateDeckDiffRoute, 
    rateQuoteRoute,
    cdrsRoute,
    billingRoute,
    webhooksRoute,
    carriersRoute,
    reportsRoute,
    supportRoute,
    supportTicketRoute,
    settingsRoute,
    catchAllRoute
  ])
]);

const router = createRouter({ 
  routeTree,
  context: { auth: undefined! }, // supplied by provider component
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const auth = useAuth();
  if (auth.isLoading) return null; // Or a full screen spinner
  return <RouterProvider router={router} context={{ auth }} />;
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
