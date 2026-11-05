import { useEffect, useRef } from 'react'
import { CircleCheck } from 'lucide-react'
import type { Transfer } from '@/api/types'
import { formatMoney } from '@/lib/format'
import './SuccessPanel.css'

interface SuccessPanelProps {
  transfer: Transfer
  isRefreshing: boolean
  refreshFailed: boolean
  canReturn: boolean
  onRetryRefresh: () => void
  onReturn: () => void
}

export default function SuccessPanel({
  transfer,
  isRefreshing,
  refreshFailed,
  canReturn,
  onRetryRefresh,
  onReturn,
}: SuccessPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section className="transfer-success" aria-label="Transfer confirmation">
      <CircleCheck className="transfer-success-icon" size={48} aria-hidden="true" />
      <div role="status" aria-live="polite">
        <h3 ref={headingRef} tabIndex={-1}>
          Transfer sent
        </h3>
        <p className="success-amount">{formatMoney(transfer.amount)}</p>
        <p>to {transfer.recipient.name}</p>
        <p className="success-recipient">
          {transfer.recipient.bank} · {transfer.recipient.accountNumberMasked}
        </p>
        <p className="success-reference">
          Reference <strong>{transfer.reference}</strong>
        </p>
        <p>The money should arrive within minutes.</p>
      </div>
      {isRefreshing && <p role="status">Refreshing dashboard…</p>}
      {refreshFailed && (
        <div>
          <p role="alert">Your transfer was sent, but we couldn't refresh your dashboard.</p>
          <button
            className="transfer-secondary"
            type="button"
            onClick={onRetryRefresh}
            disabled={isRefreshing}
          >
            Retry dashboard refresh
          </button>
        </div>
      )}
      <button className="transfer-primary" type="button" disabled={!canReturn} onClick={onReturn}>
        Back to dashboard
      </button>
    </section>
  )
}
