import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import seed from '../mock-api/db.json'
import { server } from './test/setup'
import App from './App'

const clients: QueryClient[] = []
afterEach(() => {
  clients.forEach((client) => client.clear())
  clients.length = 0
})

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  clients.push(client)
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

async function loaded() {
  await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false'))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
}

const transactionSection = () => screen.getByRole('region', { name: 'Recent transactions' })
const rows = () => within(transactionSection()).getAllByRole('listitem')

describe('App dashboard integration', () => {
  it("supplies the customer's default segment to Header from the shared customer request", async () => {
    server.use(
      http.get('*/api/customer', () =>
        HttpResponse.json({
          customer: { ...seed.customer, segment: 'premium' },
        }),
      ),
    )
    renderApp()
    await loaded()
    expect(screen.getByRole('button', { name: 'Premium' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.segment).toBe('premium')
    expect(localStorage.getItem('meridian.segment.v1')).toBeNull()
  })

  it('starts all requests concurrently and loads exactly eight transactions', async () => {
    const requests = new Map<string, URL>()
    const counts = new Map<string, number>()
    let release!: () => void
    const barrier = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.get('*/api/:resource', async ({ request, params }) => {
        const resource = String(params.resource)
        requests.set(resource, new URL(request.url))
        counts.set(resource, (counts.get(resource) ?? 0) + 1)
        if (requests.size === 3) release()
        await barrier
        if (resource === 'customer') return HttpResponse.json({ customer: seed.customer })
        if (resource === 'accounts') return HttpResponse.json({ accounts: seed.accounts })
        return HttpResponse.json({
          transactions: seed.transactions.slice(0, 8),
          total: seed.transactions.length,
        })
      }),
    )
    renderApp()
    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard…')
    expect(screen.getByRole('searchbox')).toBeDisabled()
    try {
      await loaded()
      expect([...requests.keys()].sort()).toEqual(['accounts', 'customer', 'transactions'])
      expect(requests.get('transactions')?.searchParams.get('limit')).toBe('8')
      expect(rows()).toHaveLength(8)
      expect([...counts.values()]).toEqual([1, 1, 1])
    } finally {
      release()
    }
  })

  it('keeps the dashboard loading when one resource is slower than the others', async () => {
    let release!: () => void
    const delayed = new Promise<void>((resolve) => {
      release = resolve
    })
    let fastResponses = 0
    server.use(
      http.get('*/api/customer', () => {
        fastResponses++
        return HttpResponse.json({ customer: seed.customer })
      }),
      http.get('*/api/transactions', () => {
        fastResponses++
        return HttpResponse.json({ transactions: [], total: 0 })
      }),
      http.get('*/api/accounts', async () => {
        await delayed
        return HttpResponse.json({ accounts: seed.accounts })
      }),
    )
    renderApp()
    try {
      await waitFor(() => expect(fastResponses).toBe(2))
      expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
      expect(screen.queryByText('No transactions yet.')).not.toBeInTheDocument()
      expect(screen.queryByText('Everyday Checking')).not.toBeInTheDocument()
      expect(screen.getByRole('searchbox')).toBeDisabled()
    } finally {
      release()
    }
    await loaded()
    expect(screen.getByText('Everyday Checking')).toBeInTheDocument()
    expect(screen.getByText('No transactions yet.')).toBeInTheDocument()
  })

  it.each(['customer', 'accounts', 'transactions'])(
    'recovers from a failed %s request on Retry',
    async (resource) => {
      const user = userEvent.setup()
      server.use(
        http.get(
          `*/api/${resource}`,
          () =>
            HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Down' } },
              { status: 500 },
            ),
          { once: true },
        ),
      )
      renderApp()
      expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your dashboard.")
      expect(screen.queryByRole('region', { name: 'Total available' })).not.toBeInTheDocument()
      const retry = screen.getByRole('button', { name: 'Retry' })
      await waitFor(() => expect(retry).toBeEnabled())
      await user.click(retry)
      await loaded()
      expect(screen.getByText('Everyday Checking')).toBeInTheDocument()
      expect(rows()).toHaveLength(8)
    },
  )

  it('keeps showing the error when Retry also fails', async () => {
    const user = userEvent.setup()
    let attempts = 0
    server.use(
      http.get('*/api/accounts', () => {
        attempts++
        return HttpResponse.error()
      }),
    )
    renderApp()
    await screen.findByRole('alert')
    const retry = screen.getByRole('button', { name: 'Retry' })
    await waitFor(() => expect(retry).toBeEnabled())
    await user.click(retry)
    await waitFor(() => expect(attempts).toBe(2))
    await waitFor(() => expect(retry).toBeEnabled())
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load your dashboard.")
    expect(screen.queryByText('Everyday Checking')).not.toBeInTheDocument()
  })
})
