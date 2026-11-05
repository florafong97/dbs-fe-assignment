import Skeleton from '@/components/Skeleton/Skeleton'
import type { Customer } from '@/api/types'
import { formatMoney } from '@/lib/format'

export default function DailyLimitCard({ customer }: { customer?: Customer }) {
  const remaining = customer ? customer.dailyTransferLimit - customer.transferredToday : undefined
  const remainingPercent =
    customer && customer.dailyTransferLimit > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((customer.dailyTransferLimit - customer.transferredToday) /
              customer.dailyTransferLimit) *
              100,
          ),
        )
      : 0

  return (
    <aside className="dashboard-panel dashboard-rail" aria-labelledby="limit-heading">
      <h2 id="limit-heading">Daily limit</h2>
      <p className="limit-amount amount">
        {remaining === undefined ? <Skeleton /> : formatMoney(remaining)}
      </p>
      <p className="dashboard-caption">remaining today</p>
      {customer ? (
        <progress
          className="daily-limit-progress"
          max={100}
          value={remainingPercent}
          aria-label="Daily transfer limit remaining"
          aria-valuetext={`${formatMoney(Math.max(0, remaining ?? 0))} of ${formatMoney(customer.dailyTransferLimit)} remaining`}
        />
      ) : (
        <div className="daily-limit-progress-placeholder" aria-hidden="true">
          <Skeleton />
        </div>
      )}
      <p className="dashboard-caption limit-note">Resets daily. Applies to all transfers.</p>
    </aside>
  )
}
