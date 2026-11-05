import { apiFetch } from './client'
import type {
  AccountsResponse,
  CustomerResponse,
  PayeesResponse,
  TransactionsResponse,
} from './types'

export function getCustomer(signal?: AbortSignal) {
  return apiFetch<CustomerResponse>('/api/customer', { signal })
}

export function getAccounts(signal?: AbortSignal) {
  return apiFetch<AccountsResponse>('/api/accounts', { signal })
}

export function getTransactions({ limit }: { limit: number }, signal?: AbortSignal) {
  const params = new URLSearchParams({ limit: String(limit) })
  return apiFetch<TransactionsResponse>(`/api/transactions?${params}`, { signal })
}

export function getPayees(signal?: AbortSignal) {
  return apiFetch<PayeesResponse>('/api/payees', { signal })
}
