import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './api/client'
import type { Health } from './api/types'

export default function App() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<Health>('/api/health'),
    retry: false,
  })

  const status = health.isPending
    ? 'checking…'
    : health.isError
      ? 'not connected'
      : 'connected'

  return (
    <div className="starter">
      <header className="starter-header">
        <strong>Meridian</strong>
        <span>Take-home starter</span>
      </header>

      <main className="starter-main">
        <h1>Build the dashboard and transfer flow</h1>
        <p>
          Start with <code>README.md</code>, then read{' '}
          <code>brief/candidate-brief.md</code>. Replace this screen with your
          app.
        </p>

        <p className="status" role="status">
          Mock API: {status}
        </p>
      </main>
    </div>
  )
}
