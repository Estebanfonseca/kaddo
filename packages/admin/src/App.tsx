import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, createRootRoute, createRoute, RouterProvider, Navigate } from '@tanstack/react-router'
import { AppShell } from './components/AppShell'
import { Overview } from './routes/Overview'
import { Knowledge } from './routes/Knowledge'
import { KnowledgeLayer } from './routes/KnowledgeLayer'
import { KnowledgeArtifact } from './routes/KnowledgeArtifact'
import { WorkItems } from './routes/WorkItems'
import { WorkItemDetail } from './routes/WorkItemDetail'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const rootRoute = createRootRoute({ component: AppShell })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <Navigate to="/overview" /> })
const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/overview', component: Overview })

const knowledgeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/knowledge', component: Knowledge })
const knowledgeLayerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/knowledge/$layer', component: KnowledgeLayer })
const knowledgeArtifactRoute = createRoute({ getParentRoute: () => rootRoute, path: '/knowledge/$layer/$artifactId', component: KnowledgeArtifact })

function PlaceholderRoute({ title }: { title: string }) {
  return (
    <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: 'var(--foreground)' }}>{title}</h2>
      <p style={{ fontSize: 14 }}>Coming soon</p>
    </div>
  )
}

const workItemsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work-items', component: WorkItems })
const workItemDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work-items/$workItemId', component: WorkItemDetail })
const systemRoute = createRoute({ getParentRoute: () => rootRoute, path: '/system', component: () => <PlaceholderRoute title="System" /> })

const routeTree = rootRoute.addChildren([indexRoute, overviewRoute, knowledgeRoute, knowledgeLayerRoute, knowledgeArtifactRoute, workItemsRoute, workItemDetailRoute, systemRoute])
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
