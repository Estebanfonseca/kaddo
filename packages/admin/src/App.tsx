import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, createRootRoute, createRoute, RouterProvider, Navigate } from '@tanstack/react-router'
import { AppShell } from './components/AppShell'
import { Overview } from './routes/Overview'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const rootRoute = createRootRoute({ component: AppShell })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <Navigate to="/overview" /> })
const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/overview', component: Overview })

function PlaceholderRoute({ title }: { title: string }) {
  return (
    <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: 'var(--foreground)' }}>{title}</h2>
      <p style={{ fontSize: 14 }}>Coming soon</p>
    </div>
  )
}

const knowledgeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/knowledge', component: () => <PlaceholderRoute title="Knowledge" /> })
const workItemsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work-items', component: () => <PlaceholderRoute title="Work Items" /> })
const systemRoute = createRoute({ getParentRoute: () => rootRoute, path: '/system', component: () => <PlaceholderRoute title="System" /> })

const routeTree = rootRoute.addChildren([indexRoute, overviewRoute, knowledgeRoute, workItemsRoute, systemRoute])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
