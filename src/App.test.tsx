import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { server } from './test/setup'

afterEach(cleanup)

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

describe('dashboard data', () => {
  it('starts requests concurrently and requests eight transactions', async () => {
    const requests = new Set<string>()
    let releaseResponses!: () => void
    const allStarted = new Promise<void>((resolve) => {
      releaseResponses = resolve
    })

    server.use(
      http.get('*/api/:resource', async ({ request, params }) => {
        const resource = String(params.resource)
        requests.add(resource)
        if (requests.size === 3) releaseResponses()
        // A sequential implementation cannot finish until every request starts.
        await allStarted

        if (resource === 'customer') {
          return HttpResponse.json({ customer: { firstName: 'Ava' } })
        }
        if (resource === 'accounts') return HttpResponse.json({ accounts: [] })
        expect(new URL(request.url).searchParams.get('limit')).toBe('8')
        return HttpResponse.json({ transactions: [], total: 0 })
      }),
    )

    renderApp()
    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard…')
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Dashboard data loaded.')
    })
    expect(requests).toEqual(new Set(['customer', 'accounts', 'transactions']))
  })

  it('shows an error and recovers when Retry is pressed', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/accounts', () => HttpResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Down' } },
        { status: 500 },
      ), { once: true }),
    )
    renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't load your dashboard.",
    )
    const retry = screen.getByRole('button', { name: 'Retry' })
    await waitFor(() => expect(retry).toBeEnabled())
    await user.click(retry)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Dashboard data loaded.')
    }, { timeout: 3000 })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
