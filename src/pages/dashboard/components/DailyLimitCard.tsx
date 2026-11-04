import type { Customer } from '../../../api/types'
import { formatMoney } from '../../../lib/format'

export default function DailyLimitCard({ customer }: { customer?: Customer }) {
  const remaining = customer
    ? customer.dailyTransferLimit - customer.transferredToday
    : undefined

  return (
    <aside className="dashboard-panel dashboard-rail" aria-labelledby="limit-heading">
      <h2 id="limit-heading">Daily limit</h2>
      <p className="limit-amount amount">{remaining === undefined ? '—' : formatMoney(remaining)}</p>
      <p className="dashboard-caption">remaining today</p>
      <p className="dashboard-caption">Resets daily. Applies to all transfers.</p>
    </aside>
  )
}
