import Skeleton from '@/components/Skeleton/Skeleton'
import type { Account } from '@/api/types'
import { formatMoney } from '@/lib/format'
import { Plus } from 'lucide-react'

export default function BalanceHero({
  accounts,
  isLoading,
  onNewTransfer,
}: {
  accounts?: Account[]
  isLoading: boolean
  onNewTransfer: () => void
}) {
  const deposits = accounts?.filter((account) => account.type !== 'credit')
  const totalCents = deposits?.reduce((sum, account) => sum + Math.round(account.balance * 100), 0)

  return (
    <section className="dashboard-panel balance-hero" aria-labelledby="balance-heading">
      <div className="balance-summary">
        <h2 id="balance-heading">Total available</h2>
        <p className="balance-amount amount">
          {totalCents === undefined ? <Skeleton /> : formatMoney(totalCents / 100)}
        </p>
        <p className="balance-caption">
          {deposits === undefined ? (
            <Skeleton className="skeleton-caption" />
          ) : (
            `Across ${deposits.length} deposit accounts`
          )}
        </p>
      </div>
      {isLoading ? (
        <div className="transfer-cta-container transfer-cta-placeholder" aria-hidden="true">
          <span className="transfer-cta">
            <Plus size={20} aria-hidden="true" />
            New transfer
          </span>
        </div>
      ) : (
        <div className="transfer-cta-container">
          <button
            className="transfer-cta"
            type="button"
            aria-haspopup="dialog"
            onClick={onNewTransfer}
          >
            <Plus size={20} aria-hidden="true" />
            New transfer
          </button>
        </div>
      )}
    </section>
  )
}
