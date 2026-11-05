import { setupDialogMock } from '@/test/dialog'
import { formatMoney } from '@/lib/format'
import type { TransferResponse } from '@/api/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import seed from '../mock-api/db.json'
import { server } from './test/setup'
import App from './App'

setupDialogMock()

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

async function reviewTransfer(user: ReturnType<typeof userEvent.setup>) {
  await loaded()
  await user.click(screen.getByRole('button', { name: 'New transfer' }))
  await user.click(await screen.findByRole('radio', { name: /Jamie Tan/ }, { timeout: 3000 }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.type(screen.getByRole('textbox', { name: 'Amount' }), '120')
  await user.type(screen.getByRole('textbox', { name: 'Note (optional)' }), 'Dinner')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
}

describe('App dashboard integration', () => {
  it('propagates API customer names to the greeting and avatar', async () => {
    server.use(
      http.get('*/api/customer', () =>
        HttpResponse.json({
          customer: { ...seed.customer, firstName: 'Morgan', lastName: 'Lee' },
        }),
      ),
    )
    renderApp()
    await loaded()
    expect(
      screen.getByRole('heading', { name: /Good (morning|afternoon|evening), Morgan/ }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Morgan Lee')).toHaveTextContent('ML')
  })

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

describe('App transfer integration', () => {
  // Keep newly created transfers newer than the seed transactions on every machine.
  beforeEach(() => vi.setSystemTime(new Date('2026-10-20T10:15:00Z')))
  afterEach(() => vi.useRealTimers())

  it('sends once, displays the API reference and refreshes balance, transactions and daily limit', async () => {
    const user = userEvent.setup()
    let responseBody: TransferResponse | undefined
    const realFetch = globalThis.fetch
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const response = await realFetch(input, init)
      if (init?.method === 'POST')
        responseBody = (await response.clone().json()) as TransferResponse
      return response
    })
    renderApp()
    await reviewTransfer(user)
    await user.dblClick(screen.getByRole('button', { name: 'Confirm transfer' }))
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close transfer' })).toBeDisabled()
    await screen.findByRole('heading', { name: 'Transfer sent' }, { timeout: 3000 })
    const confirmation = screen.getByRole('region', { name: 'Transfer confirmation' })
    expect(responseBody).toBeDefined()
    expect(confirmation).toHaveTextContent(responseBody!.transfer.reference)
    const back = screen.getByRole('button', { name: 'Back to dashboard' })
    await waitFor(() => expect(back).toBeEnabled(), { timeout: 3000 })
    const posts = fetchSpy.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual({
      fromAccountId: 'acc_checking',
      payeeId: 'pay_001',
      amount: 120,
      note: 'Dinner',
    })
    await user.click(back)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const money = (amount: number) => formatMoney(amount).replace(/\u00a0/g, ' ')
    expect(screen.getByRole('region', { name: 'Total available' })).toHaveTextContent(
      money(17000.55),
    )
    expect(screen.getByRole('list', { name: 'Accounts' })).toHaveTextContent(money(4160.55))
    expect(screen.getByRole('complementary', { name: 'Daily limit' })).toHaveTextContent(
      money(4880),
    )
    expect(rows()[0]).toHaveTextContent('Transfer to Jamie Tan')
  })

  it('keeps a completed transfer successful when refresh fails and retries GETs without resending', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    let accountReads = 0
    server.use(
      http.get('*/api/accounts', () => {
        accountReads++
        if (accountReads === 2)
          return HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Down' } },
            { status: 500 },
          )
        return HttpResponse.json({
          accounts: seed.accounts.map((account) =>
            accountReads > 2 && account.id === 'acc_checking'
              ? { ...account, balance: 4160.55 }
              : account,
          ),
        })
      }),
    )
    renderApp()
    await reviewTransfer(user)
    await user.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent(
      "Your transfer was sent, but we couldn't refresh your dashboard.",
    )
    expect(within(dialog).getByRole('heading', { name: 'Transfer sent' })).toBeInTheDocument()
    expect(
      within(dialog).queryByRole('button', { name: 'Confirm transfer' }),
    ).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Back to dashboard' })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: 'Retry dashboard refresh' }))
    const back = within(dialog).getByRole('button', { name: 'Back to dashboard' })
    await waitFor(() => expect(back).toBeEnabled(), { timeout: 3000 })
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
    expect(accountReads).toBe(3)
    await user.click(back)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(rows()[0]).toHaveTextContent('Transfer to Jamie Tan')
  })
})
