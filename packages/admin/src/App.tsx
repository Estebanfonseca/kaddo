import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, createRootRoute, createRoute, RouterProvider, Outlet, Navigate } from '@tanstack/react-router'
import { KaddoPageHeader } from './components/KaddoPageHeader'
import { Overview } from './routes/Overview'
import { useQuery } from '@tanstack/react-query'
import { api } from './lib/api'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function RootLayout() {
  const { data } = useQuery({ queryKey: ['project'], queryFn: api.getProject, staleTime: 60_000 }, queryClient)
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <KaddoPageHeader projectName={data?.name ?? '...'} />
      <Outlet />
    </div>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <Navigate to="/overview" /> })
const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/overview', component: Overview })

const routeTree = rootRoute.addChildren([indexRoute, overviewRoute])
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
