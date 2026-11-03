export type Segment = 'retail' | 'premium'
export type AccountType = 'checking' | 'savings' | 'credit'
export type TransactionDirection = 'in' | 'out'
export type TransactionStatus = 'posted' | 'pending'

export interface Health {
  ok: boolean
}

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  segment: Segment
  dailyTransferLimit: number
  transferredToday: number
}

export interface Account {
  id: string
  name: string
  type: AccountType
  maskedNumber: string
  balance: number
  currency: 'SGD'
}

export interface Transaction {
  id: string
  accountId: string
  date: string
  description: string
  category: string
  direction: TransactionDirection
  amount: number
  status: TransactionStatus
}

export interface Payee {
  id: string
  name: string
  bank: string
  accountNumberMasked: string
  initials: string
  lastUsedAt: string
}

export interface DailyLimit {
  limit: number
  used: number
  remaining: number
}

export interface TransferRecipient {
  name: string
  bank: string
  accountNumberMasked: string
}

export interface Transfer {
  id: string
  reference: string
  status: 'completed'
  fromAccountId: string
  recipient: TransferRecipient
  amount: number
  fee: number
  currency: 'SGD'
  note: string | null
  createdAt: string
}

export interface CreateTransferRequest {
  fromAccountId: string
  amount: number
  note?: string
  payeeId?: string
  recipient?: {
    name: string
    accountNumber: string
    bank: string
  }
}

export interface CustomerResponse {
  customer: Customer
}

export interface AccountsResponse {
  accounts: Account[]
}

export interface TransactionsResponse {
  transactions: Transaction[]
  total: number
}

export interface PayeesResponse {
  payees: Payee[]
}

export interface TransferResponse {
  transfer: Transfer
  account: Pick<Account, 'id' | 'balance'>
  dailyLimit: DailyLimit
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
    meta?: Record<string, unknown>
  }
}
