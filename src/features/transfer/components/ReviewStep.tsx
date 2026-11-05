import { Info } from 'lucide-react'
import type { Account, Payee } from '@/api/types'
import { formatMoney } from '@/lib/format'
import { parseAmountInput } from '../amount'
import type { TransferFormValues } from '../schema'
import './ReviewStep.css'

interface ReviewStepProps {
  values: TransferFormValues
  accounts: Account[]
  payees: Payee[]
}

export default function ReviewStep({ values, accounts, payees }: ReviewStepProps) {
  const account = accounts.find((item) => item.id === values.fromAccountId)
  const savedPayee = payees.find((payee) => payee.id === values.payeeId)
  const recipient =
    values.recipientMode === 'new'
      ? {
          name: values.recipient.name.trim(),
          bank: values.recipient.bank.trim(),
          maskedNumber: `•••• ${values.recipient.accountNumber.slice(-4)}`,
        }
      : savedPayee && {
          name: savedPayee.name,
          bank: savedPayee.bank,
          maskedNumber: savedPayee.accountNumberMasked,
        }
  const amount = parseAmountInput(values.amount)
  const formattedAmount = amount === null ? '—' : formatMoney(amount)

  return (
    <section className="review-step" aria-label="Transfer details">
      <dl className="review-details">
        <div className="review-row">
          <dt>From</dt>
          <dd>{account ? `${account.name} · ${account.maskedNumber}` : '—'}</dd>
        </div>
        <div className="review-row">
          <dt>To</dt>
          <dd>
            {recipient ? (
              <>
                <span className="review-recipient-name">{recipient.name}</span>
                {' · '}
                <span className="review-recipient-details">
                  {recipient.bank} · {recipient.maskedNumber}
                </span>
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="review-row">
          <dt>Amount</dt>
          <dd className="review-money">{formattedAmount}</dd>
        </div>
        <div className="review-row">
          <dt>Fee</dt>
          <dd className="review-money">{formatMoney(0)}</dd>
        </div>
        <div className="review-row">
          <dt>Note</dt>
          <dd className="review-note">{values.note || '—'}</dd>
        </div>
        <div className="review-row review-total">
          <dt>Total</dt>
          <dd className="review-money">{formattedAmount}</dd>
        </div>
      </dl>
      <p className="review-arrival">
        <Info size={18} aria-hidden="true" />
        Usually arrives in minutes.
      </p>
    </section>
  )
}
