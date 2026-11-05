import Button from '@/components/Button/Button'
import Skeleton from '@/components/Skeleton/Skeleton'
import SearchInput from '@/components/SearchInput/SearchInput'
import { useState } from 'react'
import { useTransactionSearch } from '../queries'
import { formatMoney, formatShortDate } from '@/lib/format'

interface TransactionListProps {
  isDashboardLoading?: boolean
}

export default function TransactionList({ isDashboardLoading = false }: TransactionListProps) {
  const [search, setSearch] = useState('')
  const { transactions, isSearchPending } = useTransactionSearch(search)
  const isLoading =
    isDashboardLoading || isSearchPending || transactions.isPending || transactions.isFetching
  const isError = !isSearchPending && transactions.isError
  const query = search.trim()
  const matches = transactions.data?.transactions
  const total = transactions.data?.total ?? 0

  return (
    <section
      className="transactions-section"
      aria-labelledby="transactions-heading"
      aria-busy={isLoading}
    >
      <div className="transactions-header">
        <h2 id="transactions-heading">Recent transactions</h2>
        <SearchInput
          id="transaction-search"
          label="Search transactions"
          value={search}
          onValueChange={setSearch}
          disabled={isDashboardLoading || (transactions.isPending && !query)}
        />
      </div>
      <div className="dashboard-panel transactions-card">
        {isError ? (
          <div className="transactions-empty">
            <p role="alert">We couldn't load your transactions.</p>
            <Button
              variant="secondary"
              disabled={transactions.isFetching}
              onClick={() => void transactions.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : isLoading || matches === undefined ? (
          <ul className="transaction-list" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <li className="transaction-row" key={index}>
                <div className="transaction-details">
                  <p className="transaction-description">
                    <Skeleton />
                  </p>
                  <p className="transaction-meta">
                    <Skeleton className="skeleton-short" />
                  </p>
                </div>
                <div className="transaction-value">
                  <p className="transaction-amount">
                    <Skeleton className="skeleton-money" />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {query && (
              <p className="transaction-count" role="status">
                {`${total} ${total === 1 ? 'result' : 'results'} match your search`}
                {total > matches.length && <span> Showing the newest {matches.length}.</span>}
              </p>
            )}
            {matches.length > 0 ? (
              <ul className="transaction-list">
                {matches.map((transaction) => (
                  <li key={transaction.id} className="transaction-row">
                    <div className="transaction-details">
                      <p className="transaction-description">{transaction.description}</p>
                      <p className="transaction-meta">
                        <span className="transaction-category">{transaction.category}</span>
                        {' · '}
                        <time dateTime={transaction.date}>{formatShortDate(transaction.date)}</time>
                        {transaction.status === 'pending' && (
                          <span className="pending-chip">Pending</span>
                        )}
                      </p>
                    </div>
                    <div className="transaction-value">
                      <p
                        className={`transaction-amount amount${transaction.direction === 'in' ? ' transaction-incoming' : ''}`}
                      >
                        {transaction.direction === 'in'
                          ? `+${formatMoney(transaction.amount)}`
                          : formatMoney(-transaction.amount)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="transactions-empty">
                <p>{query ? 'No transactions match your search.' : 'No transactions yet.'}</p>
                {query && (
                  <Button variant="secondary" onClick={() => setSearch('')}>
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
