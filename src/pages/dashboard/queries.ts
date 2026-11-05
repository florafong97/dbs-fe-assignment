import { queryOptions, useQuery } from '@tanstack/react-query'
import { getAccounts, getCustomer, getTransactions } from '@/api/banking'
import { useEffect, useState } from 'react'

const TRANSACTION_LIMIT_DEFAULT = 8

// Resource keys allow transfers to invalidate all affected queries later.
export const customerQueryOptions = queryOptions({
  queryKey: ['customer'],
  queryFn: ({ signal }) => getCustomer(signal),
})

export const accountsQueryOptions = queryOptions({
  queryKey: ['accounts'],
  queryFn: ({ signal }) => getAccounts(signal),
})

export function transactionsQueryOptions(limit: number, q = '') {
  return queryOptions({
    queryKey: ['transactions', { limit, q }],
    queryFn: ({ signal }) => getTransactions({ limit, q }, signal),
  })
}

export function useDashboardQueries() {
  // Independent queries start in the same render without waiting on each other.
  const customer = useQuery(customerQueryOptions)
  const accounts = useQuery(accountsQueryOptions)

  return {
    customer,
    accounts,
    isPending: customer.isPending || accounts.isPending,
    isError: customer.isError || accounts.isError,
    isFetching: customer.isFetching || accounts.isFetching,
    retry: () => Promise.all([customer.refetch(), accounts.refetch()]),
  }
}

export function useTransactionSearch(search: string) {
  const normalizedSearch = search.trim().toLowerCase()
  const [debouncedSearch, setDebouncedSearch] = useState(normalizedSearch)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(normalizedSearch), 300)
    return () => window.clearTimeout(timeout)
  }, [normalizedSearch])

  // Clearing restores the cached default query immediately.
  const query = normalizedSearch ? debouncedSearch : ''
  const transactions = useQuery(transactionsQueryOptions(TRANSACTION_LIMIT_DEFAULT, query))

  return { transactions, isSearchPending: normalizedSearch !== query }
}
