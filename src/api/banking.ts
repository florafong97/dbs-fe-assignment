import { apiFetch } from './client'
import { withDebugParams } from './debug'
import type {
  AccountsResponse,
  CustomerResponse,
  CreateTransferRequest,
  TransferResponse,
  PayeesResponse,
  TransactionsResponse,
} from './types'

export function getCustomer(signal?: AbortSignal) {
  return apiFetch<CustomerResponse>(withDebugParams('/api/customer', 'customer'), { signal })
}

export function getAccounts(signal?: AbortSignal) {
  return apiFetch<AccountsResponse>(withDebugParams('/api/accounts', 'accounts'), { signal })
}

export function getTransactions({ limit, q }: { limit: number; q?: string }, signal?: AbortSignal) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (q) params.set('q', q)
  return apiFetch<TransactionsResponse>(
    withDebugParams(`/api/transactions?${params}`, 'transactions'),
    { signal },
  )
}

export function getPayees(signal?: AbortSignal) {
  return apiFetch<PayeesResponse>(withDebugParams('/api/payees', 'payees'), { signal })
}

export function createTransfer(payload: CreateTransferRequest) {
  return apiFetch<TransferResponse>('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
