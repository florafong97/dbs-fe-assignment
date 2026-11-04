import { queryOptions, useQuery } from '@tanstack/react-query'
import { getAccounts, getCustomer, getTransactions } from '../../api/banking'

// Resource keys allow transfers to invalidate all affected queries later.
export const customerQueryOptions = queryOptions({
  queryKey: ['customer'],
  queryFn: ({ signal }) => getCustomer(signal),
})

export const accountsQueryOptions = queryOptions({
  queryKey: ['accounts'],
  queryFn: ({ signal }) => getAccounts(signal),
})

export function transactionsQueryOptions(limit: number) {
  return queryOptions({
    queryKey: ['transactions', { limit }],
    queryFn: ({ signal }) => getTransactions({ limit }, signal),
  })
}

export function useDashboardQueries() {
  // Independent queries start in the same render without waiting on each other.
  const customer = useQuery(customerQueryOptions)
  const accounts = useQuery(accountsQueryOptions)
  const transactions = useQuery(transactionsQueryOptions(8))

  return {
    customer,
    accounts,
    transactions,
    isPending: customer.isPending || accounts.isPending || transactions.isPending,
    isError: customer.isError || accounts.isError || transactions.isError,
    isFetching: customer.isFetching || accounts.isFetching || transactions.isFetching,
    retry: () => Promise.all([
      customer.refetch(),
      accounts.refetch(),
      transactions.refetch(),
    ]),
  }
}
