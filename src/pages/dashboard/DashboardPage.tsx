import Button from '@/components/Button/Button'
import AccountCardSkeleton from './components/AccountCardSkeleton'
import TransactionList from './components/TransactionList'
import AccountCard from './components/AccountCard'
import BalanceHero from './components/BalanceHero'
import DailyLimitCard from './components/DailyLimitCard'
import type { Account, Customer } from '@/api/types'
import './dashboard.css'

interface DashboardPageProps {
  accounts?: Account[]
  customer?: Customer
  isPending: boolean
  isRefreshing?: boolean
  isError: boolean
  isFetching: boolean
  onNewTransfer: () => void
  onRetry: () => void
}

export default function DashboardPage({
  accounts: accountData,
  customer: customerData,
  isPending,
  isRefreshing = false,
  isError,
  isFetching,
  onRetry,
  onNewTransfer,
}: DashboardPageProps) {
  const isLoading = (isPending || isRefreshing) && !isError
  const accounts = isLoading ? undefined : accountData
  const customer = isLoading ? undefined : customerData

  return (
    <>
      <p className="visually-hidden" role="status">
        {isLoading ? 'Loading dashboard…' : isError ? '' : 'Dashboard loaded.'}
      </p>
      <main
        id="overview"
        className="app-container dashboard-layout"
        tabIndex={-1}
        aria-busy={isLoading}
      >
        {isError ? (
          <div className="dashboard-feedback">
            <p role="alert">We couldn't load your dashboard.</p>
            <Button variant="primary" disabled={isFetching} onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="dashboard-main">
              <BalanceHero
                accounts={accounts}
                isLoading={isPending && !isError}
                onNewTransfer={onNewTransfer}
              />
              <section className="accounts-section" aria-labelledby="accounts-heading">
                <h2 id="accounts-heading">Accounts</h2>
                {accounts ? (
                  accounts.length > 0 ? (
                    <ul className="account-list" tabIndex={0} aria-labelledby="accounts-heading">
                      {accounts.map((account) => (
                        <AccountCard key={account.id} account={account} />
                      ))}
                    </ul>
                  ) : (
                    <p className="dashboard-caption">No accounts to show.</p>
                  )
                ) : (
                  <ul className="account-list" aria-hidden="true">
                    {Array.from({ length: 3 }, (_, index) => (
                      <AccountCardSkeleton key={index} />
                    ))}
                  </ul>
                )}
              </section>
              <TransactionList isDashboardLoading={isLoading} />
            </div>
            <DailyLimitCard customer={customer} />
          </>
        )}
      </main>
    </>
  )
}
