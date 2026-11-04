import { CreditCard, Landmark, PiggyBank } from 'lucide-react'
import type { Account } from '../../../api/types'
import { formatMoney } from '../../../lib/format'

export default function AccountCard({ account }: { account: Account }) {
  const Icon = account.type === 'credit' ? CreditCard : account.type === 'savings' ? PiggyBank : Landmark

  return (
    <li className="dashboard-panel account-card">
      <Icon className="account-icon" size={24} aria-hidden="true" />
      <h3>{account.name}</h3>
      <p className="account-number amount">{account.maskedNumber}</p>
      <p className="account-balance amount">{formatMoney(account.balance)}</p>
      <p className="account-label">{account.type === 'credit' ? 'Amount due' : 'Available balance'}</p>
    </li>
  )
}
