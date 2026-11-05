import { ChevronDown } from 'lucide-react'
import { formatAmountInput } from '../amount'
import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import type { Account } from '@/api/types'
import FormField from '@/components/FormField/FormField'
import { formatMoney } from '@/lib/format'
import type { TransferFormValues } from '../schema'
import './AmountStep.css'

interface AmountStepProps {
  form: UseFormReturn<TransferFormValues>
  accounts: Account[]
  remainingDailyLimit: number
}

export default function AmountStep({ form, accounts, remainingDailyLimit }: AmountStepProps) {
  const [fromAccountId, amount, note] = useWatch({
    control: form.control,
    name: ['fromAccountId', 'amount', 'note'],
  })
  const deposits = accounts.filter((account) => account.type !== 'credit')
  const selectedAccount = deposits.find((account) => account.id === fromAccountId)
  const { errors } = form.formState

  return (
    <div className="amount-step">
      <FormField id="from-account" label="From account" error={errors.fromAccountId?.message}>
        {(controlProps) => (
          <div className="form-field-select">
            <select {...form.register('fromAccountId')} {...controlProps}>
              <option value="" disabled>
                Choose an account
              </option>
              {deposits.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.maskedNumber}
                </option>
              ))}
            </select>
            <ChevronDown size={18} aria-hidden="true" />
          </div>
        )}
      </FormField>
      <p className="amount-help">Deposit accounts only</p>
      <FormField id="transfer-amount" label="Amount" error={errors.amount?.message}>
        {(controlProps) => {
          const registration = form.register('amount', {
            onBlur: (event) => {
              const value: string = event.target.value
              const formatted = formatAmountInput(value)
              if (formatted !== value) form.setValue('amount', formatted, { shouldDirty: true })
            },
          })
          return (
            <div className="amount-input-wrapper">
              <span className="amount-currency" aria-hidden="true">
                SGD
              </span>
              <input
                {...registration}
                {...controlProps}
                value={amount}
                onChange={(event) => {
                  // Allow incomplete edits (empty or a trailing dot), but no third decimal digit.
                  if (/^\d*(?:\.\d{0,2})?$/.test(event.target.value)) {
                    void registration.onChange(event)
                  }
                }}
                className={`${controlProps.className} amount-input`}
                aria-describedby={[
                  controlProps['aria-describedby'],
                  'amount-available',
                  'amount-daily-limit',
                ]
                  .filter(Boolean)
                  .join(' ')}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
              />
            </div>
          )
        }}
      </FormField>
      <div className="amount-presets" role="group" aria-label="Suggested amounts">
        {[50, 100, 250, 500].map((preset) => (
          <button
            type="button"
            key={preset}
            aria-pressed={amount.trim() !== '' && Number(amount) === preset}
            onClick={() =>
              form.setValue('amount', formatAmountInput(String(preset)), {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="amount-balances">
        <p id="amount-available">
          Available {selectedAccount ? formatMoney(selectedAccount.balance) : '—'}
        </p>
        <p id="amount-daily-limit">Remaining daily limit {formatMoney(remainingDailyLimit)}</p>
      </div>
      <FormField
        id="transfer-note"
        label="Note (optional)"
        className="amount-note-field"
        error={errors.note?.message}
      >
        {(controlProps) => (
          <>
            <textarea
              {...form.register('note')}
              {...controlProps}
              aria-describedby={[controlProps['aria-describedby'], 'note-counter']
                .filter(Boolean)
                .join(' ')}
              rows={3}
            />
            <span className="note-counter" id="note-counter">
              {note.length}/50
            </span>
          </>
        )}
      </FormField>
    </div>
  )
}
