import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '@/api/types'
import { server } from '@/test/setup'
import { formatMoney, formatShortDate } from '@/lib/format'
import seed from '../../../../mock-api/db.json'
import TransactionList from './TransactionList'

const clients: QueryClient[] = []
afterEach(() => {
  clients.forEach((client) => client.clear())
  clients.length = 0
})

function renderTransactions() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  clients.push(client)
  return render(
    <QueryClientProvider client={client}>
      <TransactionList />
    </QueryClientProvider>,
  )
}

const transactionSection = () => screen.getByRole('region', { name: 'Recent transactions' })
const rows = () => within(transactionSection()).getAllByRole('listitem')
const money = (value: number) => formatMoney(value).replace(/\u00a0/g, ' ')
async function transactionsLoaded() {
  await waitFor(() => expect(transactionSection()).toHaveAttribute('aria-busy', 'false'))
}

describe('TransactionList rendering', () => {
  it('distinguishes an empty history from loading', async () => {
    server.use(
      http.get('*/api/transactions', () => HttpResponse.json({ transactions: [], total: 0 })),
    )
    renderTransactions()
    expect(transactionSection()).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('No transactions yet.')).not.toBeInTheDocument()
    expect(await screen.findByText('No transactions yet.')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeEnabled()
    expect(screen.queryByText(/match your search/)).not.toBeInTheDocument()
  })

  it('uses the server total when search matches exceed the eight displayed rows', async () => {
    const user = userEvent.setup({ delay: null })
    const matches = Array.from({ length: 10 }, (_, index) => ({
      ...seed.transactions[0],
      id: `match-${index}`,
      description: `Groceries ${index}`,
    }))
    server.use(
      http.get('*/api/transactions', () =>
        HttpResponse.json({ transactions: matches.slice(0, 8), total: 10 }),
      ),
    )
    renderTransactions()
    await transactionsLoaded()
    await user.type(screen.getByRole('searchbox'), 'groceries')
    expect(await screen.findByText(/10 results match your search/)).toHaveTextContent(
      'Showing the newest 8.',
    )
    expect(rows()).toHaveLength(8)
  })

  it('renders the eight newest transactions with direction, dates and pending status', async () => {
    renderTransactions()
    await transactionsLoaded()
    expect(rows()).toHaveLength(8)
    seed.transactions.slice(0, 8).forEach((transaction, index) => {
      const row = rows()[index]
      expect(row).toHaveTextContent(transaction.description)
      expect(row).toHaveTextContent(transaction.category)
      expect(row).toHaveTextContent(formatShortDate(transaction.date))
      expect(row).toHaveTextContent(
        transaction.direction === 'in'
          ? `+${money(transaction.amount)}`
          : money(-transaction.amount),
      )
      expect(within(row).queryByText('Pending') !== null).toBe(transaction.status === 'pending')
    })
  })

  it('shows Singapore dates across midnight and zero amounts without a negative incoming sign', async () => {
    const transaction: Transaction = {
      ...(seed.transactions[0] as Transaction),
      date: '2026-10-18T18:30:00Z',
      amount: 0,
      direction: 'in',
    }
    server.use(
      http.get('*/api/transactions', () =>
        HttpResponse.json({ transactions: [transaction], total: 1 }),
      ),
    )
    renderTransactions()
    await transactionsLoaded()
    expect(rows()[0]).toHaveTextContent('19 Oct')
    expect(rows()[0]).toHaveTextContent(`+${money(0)}`)
  })
})

describe('TransactionList search', () => {
  it.each([
    ['  nETfLiX  ', 'netflix', 'Netflix', 1],
    ['  INCOME  ', 'income', 'Bonus interest', 2],
  ])(
    'searches the full history for %j and restores recent transactions on clear',
    async (input, q, description, total) => {
      const user = userEvent.setup({ delay: null })
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      renderTransactions()
      await transactionsLoaded()
      expect(screen.queryByText(description)).not.toBeInTheDocument()
      const search = screen.getByRole('searchbox', { name: 'Search transactions' })
      await user.type(search, input)
      expect(search).toHaveFocus()
      expect(search).toBeEnabled()
      expect(transactionSection()).toHaveAttribute('aria-busy', 'true')
      expect(await screen.findByText(description, {}, { timeout: 3000 })).toBeInTheDocument()
      expect(rows()).toHaveLength(total)
      expect(
        screen.getByText(`${total} ${total === 1 ? 'result' : 'results'} match your search`),
      ).toBeInTheDocument()
      const searches = fetchSpy.mock.calls
        .map(([url]) => new URL(String(url), 'http://localhost'))
        .filter((url) => url.pathname === '/api/transactions' && url.searchParams.has('q'))
      expect(searches).toHaveLength(1)
      expect(searches[0].searchParams.get('q')).toBe(q)
      expect(searches[0].searchParams.get('limit')).toBe('8')
      await user.click(screen.getByRole('button', { name: 'Clear search' }))
      expect(search).toHaveValue('')
      await waitFor(() => expect(rows()).toHaveLength(8))
      expect(rows()[0]).toHaveTextContent('FairPrice Finest')
      await user.type(search, '   ')
      expect(rows()).toHaveLength(8)
      expect(transactionSection()).toHaveAttribute('aria-busy', 'false')
    },
  )

  it('keeps search errors local, retries the same query and recovers from no matches', async () => {
    const user = userEvent.setup({ delay: null })
    let attempts = 0
    server.use(
      http.get('*/api/transactions', ({ request }) => {
        const q = new URL(request.url).searchParams.get('q')
        if (!q) return HttpResponse.json({ transactions: seed.transactions.slice(0, 8), total: 15 })
        attempts++
        if (attempts === 1)
          return HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Down' } },
            { status: 500 },
          )
        expect(q).toBe('missing')
        return HttpResponse.json({ transactions: [], total: 0 })
      }),
    )
    renderTransactions()
    await transactionsLoaded()
    await user.type(screen.getByRole('searchbox', { name: 'Search transactions' }), 'missing')
    expect(await within(transactionSection()).findByRole('alert')).toHaveTextContent(
      "We couldn't load your transactions.",
    )
    await user.click(within(transactionSection()).getByRole('button', { name: 'Retry' }))
    const empty = await screen.findByText('No transactions match your search.')
    expect(attempts).toBe(2)
    expect(screen.getByText('0 results match your search')).toBeInTheDocument()
    await user.click(within(empty.parentElement!).getByRole('button', { name: 'Clear search' }))
    await waitFor(() => expect(rows()).toHaveLength(8))
  })

  it('ignores a superseded search response when the input is cleared', async () => {
    const user = userEvent.setup({ delay: null })
    let release!: () => void
    const barrier = new Promise<void>((resolve) => {
      release = resolve
    })
    let started = false
    server.use(
      http.get('*/api/transactions', async ({ request }) => {
        if (!new URL(request.url).searchParams.has('q'))
          return HttpResponse.json({ transactions: seed.transactions.slice(0, 8), total: 15 })
        started = true
        await barrier
        return HttpResponse.json({ transactions: [seed.transactions[10]], total: 1 })
      }),
    )
    renderTransactions()
    await transactionsLoaded()
    try {
      const search = screen.getByRole('searchbox', { name: 'Search transactions' })
      await user.type(search, 'netflix')
      await waitFor(() => expect(started).toBe(true))
      await user.click(screen.getByRole('button', { name: 'Clear search' }))
      await waitFor(() => expect(rows()).toHaveLength(8))
      await act(async () => {
        release()
        await barrier
      })
      expect(search).toHaveValue('')
      expect(rows()[0]).toHaveTextContent('FairPrice Finest')
      expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
    } finally {
      release()
    }
  })
})
