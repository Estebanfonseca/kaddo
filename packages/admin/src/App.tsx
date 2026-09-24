import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, createRootRoute, createRoute, RouterProvider, Navigate } from '@tanstack/react-router'
import { AppShell } from './components/AppShell'
import { Overview } from './routes/Overview'
import { Knowledge } from './routes/Knowledge'
import { KnowledgeLayer } from './routes/KnowledgeLayer'
import { KnowledgeArtifact } from './routes/KnowledgeArtifact'
import { WorkItems } from './routes/WorkItems'
import { WorkItemDetail } from './routes/WorkItemDetail'
import { WorkItemNew } from './routes/WorkItemNew'
import { WorkItemEditor } from './routes/WorkItemEditor'
import { System } from './routes/System'
import { Integrations } from './routes/Integrations'
import { ExternalWorkItems } from './routes/ExternalWorkItems'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const rootRoute = createRootRoute({ component: AppShell })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <Navigate to="/overview" /> })
const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/overview', component: Overview })

const knowledgeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/knowledge', component: Knowledge })
const knowledgeLayerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/knowledge/$layer', component: KnowledgeLayer })
const knowledgeArtifactRoute = createRoute({ getParentRoute: () => rootRoute, path: '/knowledge/$layer/$artifactId', component: KnowledgeArtifact })

const workItemsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work-items', component: WorkItems })
const workItemNewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work-items/new', component: WorkItemNew })
const workItemDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work-items/$workItemId', component: WorkItemDetail })
const workItemEditRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work-items/$workItemId/edit', component: WorkItemEditor })
const systemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/system',
  component: System,
  validateSearch: (search: Record<string, unknown>): { node?: string; workItem?: string } => ({
    node: typeof search.node === 'string' ? search.node : undefined,
    workItem: typeof search.workItem === 'string' ? search.workItem : undefined,
  }),
})

const integrationsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/integrations', component: Integrations })
const externalWorkItemsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/external-items', component: ExternalWorkItems })

const routeTree = rootRoute.addChildren([indexRoute, overviewRoute, knowledgeRoute, knowledgeLayerRoute, knowledgeArtifactRoute, workItemsRoute, workItemNewRoute, workItemDetailRoute, workItemEditRoute, systemRoute, integrationsRoute, externalWorkItemsRoute])
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
