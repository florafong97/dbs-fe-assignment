import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import type { Account, Customer, Transaction } from '../../api/types'
import seed from '../../../mock-api/db.json'
import DashboardPage from './DashboardPage'
import { formatMoney, formatShortDate } from '../../lib/format'

const props: ComponentProps<typeof DashboardPage> = {
  accounts: seed.accounts as Account[],
  customer: seed.customer as Customer,
  transactions: seed.transactions.slice(0, 8) as Transaction[],
  isPending: false,
  isError: false,
  isFetching: false,
  onRetry: () => {},
}

function renderDashboard(overrides: Partial<ComponentProps<typeof DashboardPage>> = {}) {
  return render(<DashboardPage {...props} {...overrides} />)
}

// Text matchers normalize Intl's non-breaking currency space.
const money = (value: number) => formatMoney(value).replace(/\u00a0/g, ' ')
const transactionSection = () => screen.getByRole('region', { name: 'Recent transactions' })
const rows = () => within(transactionSection()).getAllByRole('listitem')

describe('DashboardPage', () => {
  it('renders supplied data without owning a header or needing a query provider', () => {
    render(<DashboardPage {...props} />)
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByText('Everyday Checking')).toBeInTheDocument()
    expect(screen.getByText('FairPrice Finest')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('holds supplied data behind skeletons until all requests finish', () => {
    const view = render(<DashboardPage {...props} isPending />)
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('searchbox')).toBeDisabled()
    expect(screen.queryByText('Everyday Checking')).not.toBeInTheDocument()
    view.rerender(<DashboardPage {...props} />)
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByText('Everyday Checking')).toBeInTheDocument()
  })

  it('gives errors priority over loading and invokes the supplied retry callback', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    const view = render(<DashboardPage {...props} isPending isError onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load your dashboard.")
    expect(screen.queryByRole('region', { name: 'Total available' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    view.rerender(<DashboardPage {...props} isError isFetching onRetry={onRetry} />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('distinguishes empty supplied lists from loading', () => {
    render(<DashboardPage {...props} accounts={[]} transactions={[]} />)
    expect(screen.getByText('No accounts to show.')).toBeInTheDocument()
    expect(screen.getByText('No transactions yet.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Total available' })).toHaveTextContent(money(0))
    expect(screen.getByText('Across 0 deposit accounts')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeEnabled()
  })

  it("shows deposit-only total, masked account balances and remaining daily limit", () => {
    renderDashboard({ customer: { ...props.customer!, transferredToday: 120 } });
    expect(
      screen.getByRole("region", { name: "Total available" }),
    ).toHaveTextContent(money(17120.55));
    expect(screen.getByText("Across 2 deposit accounts")).toBeInTheDocument();
    const accounts = within(
      screen.getByRole("list", { name: "Accounts" }),
    ).getAllByRole("listitem");
    expect(accounts).toHaveLength(3);
    seed.accounts.forEach((account, index) => {
      expect(accounts[index]).toHaveTextContent(account.name);
      expect(accounts[index]).toHaveTextContent(account.maskedNumber);
      expect(accounts[index]).toHaveTextContent(money(account.balance));
    });
    expect(accounts[2]).toHaveTextContent("Amount due");
    expect(
      screen.getByRole("complementary", { name: "Daily limit" }),
    ).toHaveTextContent(money(4880));
  });

  it("renders the eight newest transactions with direction, dates and pending status", () => {
    renderDashboard();
    expect(rows()).toHaveLength(8);
    seed.transactions.slice(0, 8).forEach((transaction, index) => {
      const row = rows()[index];
      expect(row).toHaveTextContent(transaction.description);
      expect(row).toHaveTextContent(transaction.category);
      expect(row).toHaveTextContent(formatShortDate(transaction.date));
      expect(row).toHaveTextContent(
        transaction.direction === "in"
          ? `+${money(transaction.amount)}`
          : money(-transaction.amount),
      );
      expect(within(row).queryByText("Pending") !== null).toBe(
        transaction.status === "pending",
      );
    });
  });

  it("shows Singapore dates across midnight and zero amounts without a negative sign for incoming money", () => {
    renderDashboard({
      transactions: [{
        ...props.transactions![0],
        date: "2026-10-18T18:30:00Z",
        amount: 0,
        direction: "in",
      }],
    });
    expect(rows()[0]).toHaveTextContent("19 Oct");
    expect(rows()[0]).toHaveTextContent(`+${money(0)}`);
  });

  it("filters description OR category without case sensitivity and clears with the keyboard", async () => {
    const user = userEvent.setup();
    renderDashboard();
    const search = screen.getByRole("searchbox", {
      name: "Search transactions",
    });
    await user.type(search, "  FAIRprice  ");
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent("FairPrice Finest");
    expect(screen.getByText("1 result match your search")).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "INCOME");
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent("Salary — Northwind Labs");
    await user.tab();
    expect(screen.getByRole("button", { name: "Clear search" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(search).toHaveValue("");
    expect(rows()).toHaveLength(8);
    await user.type(search, "   ");
    expect(rows()).toHaveLength(8);
  });

  it("reports plural match counts and restores results from a no-match state", async () => {
    const user = userEvent.setup();
    renderDashboard();
    const search = screen.getByRole("searchbox");
    await user.type(search, "o");
    expect(rows().length).toBeGreaterThan(1);
    expect(
      screen.getByText(`${rows().length} results match your search`),
    ).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "no-such-transaction");
    const emptyMessage = screen.getByText("No transactions match your search.");
    expect(emptyMessage).toBeInTheDocument();
    expect(
      within(transactionSection()).queryByRole("list"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("0 results match your search")).toBeInTheDocument();
    await user.click(
      within(emptyMessage.parentElement!).getByRole("button", { name: "Clear search" }),
    );
    expect(rows()).toHaveLength(8);
  });

  it("handles zero deposit balances and an exhausted daily limit", () => {
    renderDashboard({
      accounts: props.accounts!.map((account) =>
        account.type === "credit" ? account : { ...account, balance: 0 },
      ),
      customer: { ...props.customer!, transferredToday: 5000 },
    });
    expect(
      screen.getByRole("region", { name: "Total available" }),
    ).toHaveTextContent(money(0));
    expect(
      screen.getByRole("complementary", { name: "Daily limit" }),
    ).toHaveTextContent(money(0));
  });

})
