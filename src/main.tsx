import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

async function enableMocking() {
  const { worker } = await import('./mocks/browser')
  await Promise.race([
    worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
      },
    }),
    new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error('Timed out starting the mock worker')),
        2500,
      )
    }),
  ])
}

async function bootstrap() {
  try {
    await enableMocking()
  } catch (error) {
    // Render anyway so the error is visible instead of a blank page.
    console.error(
      'Mock API failed to start. Check that public/mockServiceWorker.js exists.',
      error,
    )
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
