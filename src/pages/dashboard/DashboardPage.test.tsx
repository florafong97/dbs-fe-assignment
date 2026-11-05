import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import type { Account, Customer } from '@/api/types'
import seed from '../../../mock-api/db.json'
import DashboardPage from './DashboardPage'
import { formatMoney } from '@/lib/format'

// Keep page tests focused on layout and supplied customer/account data.
vi.mock('./components/TransactionList', () => ({
  default: ({ isDashboardLoading }: { isDashboardLoading: boolean }) => (
    <section aria-label="Recent transactions" aria-busy={isDashboardLoading} />
  ),
}))

const props: ComponentProps<typeof DashboardPage> = {
  accounts: seed.accounts as Account[],
  customer: seed.customer as Customer,
  isPending: false,
  isError: false,
  isFetching: false,
  onRetry: () => {},
  onNewTransfer: () => {},
}

function renderDashboard(overrides: Partial<ComponentProps<typeof DashboardPage>> = {}) {
  return render(<DashboardPage {...props} {...overrides} />)
}

// Text matchers normalize Intl's non-breaking currency space.
const money = (value: number) => formatMoney(value).replace(/\u00a0/g, ' ')
const transactionSection = () => screen.getByRole('region', { name: 'Recent transactions' })

describe('DashboardPage', () => {
  it('renders supplied data without owning a header or needing a query provider', () => {
    render(<DashboardPage {...props} />)
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByText('Everyday Checking')).toBeInTheDocument()
    expect(transactionSection()).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('holds supplied data behind skeletons until all requests finish', () => {
    const view = render(<DashboardPage {...props} isPending />)
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
    expect(transactionSection()).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('button', { name: 'New transfer' })).not.toBeInTheDocument()
    expect(screen.queryByText('Everyday Checking')).not.toBeInTheDocument()
    view.rerender(<DashboardPage {...props} />)
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByText('Everyday Checking')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New transfer' })).toBeEnabled()
  })

  it('gives errors priority over loading and invokes the supplied retry callback', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    const view = render(<DashboardPage {...props} isPending isError onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load your dashboard.")
    expect(screen.queryByRole('button', { name: 'New transfer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Total available' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    view.rerender(<DashboardPage {...props} isError isFetching onRetry={onRetry} />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('delegates transfer opening and keeps the CTA available during background refreshes', async () => {
    const user = userEvent.setup()
    const onNewTransfer = vi.fn()
    renderDashboard({ onNewTransfer, isFetching: true })
    const button = screen.getByRole('button', { name: 'New transfer' })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    await user.click(button)
    expect(onNewTransfer).toHaveBeenCalledTimes(1)
  })

  it('distinguishes empty supplied lists from loading', () => {
    render(<DashboardPage {...props} accounts={[]} />)
    expect(screen.getByText('No accounts to show.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Total available' })).toHaveTextContent(money(0))
    expect(screen.getByText('Across 0 deposit accounts')).toBeInTheDocument()
  })

  it('shows deposit-only total, masked account balances and remaining daily limit', () => {
    renderDashboard({ customer: { ...props.customer!, transferredToday: 120 } })
    expect(screen.getByRole('region', { name: 'Total available' })).toHaveTextContent(
      money(17120.55),
    )
    expect(screen.getByText('Across 2 deposit accounts')).toBeInTheDocument()
    const accounts = within(screen.getByRole('list', { name: 'Accounts' })).getAllByRole('listitem')
    expect(accounts).toHaveLength(3)
    seed.accounts.forEach((account, index) => {
      expect(accounts[index]).toHaveTextContent(account.name)
      expect(accounts[index]).toHaveTextContent(account.maskedNumber)
      expect(accounts[index]).toHaveTextContent(money(account.balance))
    })
    expect(accounts[2]).toHaveTextContent('Amount due')
    expect(screen.getByRole('complementary', { name: 'Daily limit' })).toHaveTextContent(
      money(4880),
    )
  })

  it('handles zero deposit balances and an exhausted daily limit', () => {
    renderDashboard({
      accounts: props.accounts!.map((account) =>
        account.type === 'credit' ? account : { ...account, balance: 0 },
      ),
      customer: { ...props.customer!, transferredToday: 5000 },
    })
    expect(screen.getByRole('region', { name: 'Total available' })).toHaveTextContent(money(0))
    expect(screen.getByRole('complementary', { name: 'Daily limit' })).toHaveTextContent(money(0))
  })
})
