import { apiFetch } from './client'
import type {
  AccountsResponse,
  CustomerResponse,
  CreateTransferRequest,
  TransferResponse,
  PayeesResponse,
  TransactionsResponse,
} from './types'

export function getCustomer(signal?: AbortSignal) {
  return apiFetch<CustomerResponse>('/api/customer', { signal })
}

export function getAccounts(signal?: AbortSignal) {
  return apiFetch<AccountsResponse>('/api/accounts', { signal })
}

export function getTransactions({ limit, q }: { limit: number; q?: string }, signal?: AbortSignal) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (q) params.set('q', q)
  return apiFetch<TransactionsResponse>(`/api/transactions?${params}`, { signal })
}

export function getPayees(signal?: AbortSignal) {
  return apiFetch<PayeesResponse>('/api/payees', { signal })
}

export function createTransfer(payload: CreateTransferRequest) {
  return apiFetch<TransferResponse>('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
