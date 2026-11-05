import Skeleton from '@/components/Skeleton/Skeleton'
import type { Account } from '@/api/types'
import { formatMoney } from '@/lib/format'

export default function BalanceHero({ accounts }: { accounts?: Account[] }) {
  const deposits = accounts?.filter((account) => account.type !== 'credit')
  const total = deposits?.reduce((sum, account) => sum + Math.round(account.balance * 100), 0)

  return (
    <section className="dashboard-panel balance-hero" aria-labelledby="balance-heading">
      <h2 id="balance-heading">Total available</h2>
      <p className="balance-amount amount">
        {total === undefined ? <Skeleton /> : formatMoney(total / 100)}
      </p>
      <p className="balance-caption">
        {deposits === undefined ? (
          <Skeleton className="skeleton-caption" />
        ) : (
          `Across ${deposits.length} deposit accounts`
        )}
      </p>
    </section>
  )
}
