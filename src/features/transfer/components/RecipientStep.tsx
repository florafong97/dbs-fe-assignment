import Button from '@/components/Button/Button'
import FormField from '@/components/FormField/FormField'
import SearchInput from '@/components/SearchInput/SearchInput'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import type { Payee } from '@/api/types'
import Skeleton from '@/components/Skeleton/Skeleton'
import type { TransferFormValues } from '../schema'
import './RecipientStep.css'

const banks = ['DBS', 'OCBC', 'UOB', 'POSB'] as const

interface RecipientStepProps {
  form: UseFormReturn<TransferFormValues>
  payees?: Payee[]
  isPending: boolean
  isError: boolean
  isFetching: boolean
  onRetry: () => void
}

export default function RecipientStep({
  form,
  payees,
  isPending,
  isError,
  isFetching,
  onRetry,
}: RecipientStepProps) {
  const [search, setSearch] = useState('')
  const newRecipientRef = useRef<HTMLDivElement>(null)
  const mode = useWatch({ control: form.control, name: 'recipientMode' })
  const selectedPayee = useWatch({ control: form.control, name: 'payeeId' })
  const query = search.trim().toLowerCase()
  const matches = payees?.filter((payee) =>
    `${payee.name} ${payee.bank}`.toLowerCase().includes(query),
  )
  const { errors } = form.formState

  useEffect(() => {
    if (mode === 'new') {
      newRecipientRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  }, [mode])

  function toggleNewRecipient() {
    form.setValue('recipientMode', mode === 'new' ? 'saved' : 'new', { shouldDirty: true })
    form.clearErrors(['payeeId', 'recipient'])
  }

  return (
    <div className="recipient-step">
      <SearchInput
        id="payee-search"
        label="Search payees"
        value={search}
        onValueChange={setSearch}
      />
      {isError ? (
        <div>
          <p role="alert">We couldn't load your recipients.</p>
          <Button variant="secondary" disabled={isFetching} onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : isPending ? (
        <div>
          <p role="status">Loading recipients…</p>
          <div className="payee-loading" aria-hidden="true">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        </div>
      ) : (
        <fieldset
          className="payee-options"
          aria-describedby={errors.payeeId ? 'payee-error' : undefined}
        >
          <legend>Saved recipients</legend>
          {matches?.map((payee) => (
            <label className="payee-option" key={payee.id}>
              <input
                type="radio"
                value={payee.id}
                checked={mode === 'saved' && selectedPayee === payee.id}
                aria-invalid={!!errors.payeeId}
                aria-describedby={errors.payeeId ? 'payee-error' : undefined}
                {...form.register('payeeId', {
                  onChange: () => {
                    form.setValue('recipientMode', 'saved', { shouldDirty: true })
                    form.clearErrors('recipient')
                  },
                })}
              />
              <span className="payee-initials" aria-hidden="true">
                {payee.initials}
              </span>
              <span className="payee-details">
                <strong>{payee.name}</strong>
                <span>
                  {payee.bank} · {payee.accountNumberMasked}
                </span>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </label>
          ))}
          {payees?.length === 0 ? (
            <p>No saved recipients yet.</p>
          ) : (
            matches?.length === 0 && (
              <div>
                <p>No recipients match your search.</p>
              </div>
            )
          )}
        </fieldset>
      )}
      {mode === 'saved' && errors.payeeId && (
        <p className="transfer-field-error" id="payee-error">
          {errors.payeeId.message}
        </p>
      )}
      <button
        className="new-recipient-toggle"
        type="button"
        aria-expanded={mode === 'new'}
        aria-controls="new-recipient-fields"
        onClick={toggleNewRecipient}
      >
        <Plus size={18} aria-hidden="true" />
        Send to someone new
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {mode === 'new' && (
        <div ref={newRecipientRef} id="new-recipient-fields" className="new-recipient-fields">
          {(
            [
              ['name', 'Recipient name'],
              ['accountNumber', 'Account number (8 digits)'],
            ] as const
          ).map(([field, label]) => {
            const error = errors.recipient?.[field]
            return (
              <FormField key={field} id={`recipient-${field}`} label={label} error={error?.message}>
                {(controlProps) => (
                  <input
                    {...form.register(`recipient.${field}`)}
                    {...controlProps}
                    type="text"
                    autoComplete="off"
                    inputMode={field === 'accountNumber' ? 'numeric' : undefined}
                  />
                )}
              </FormField>
            )
          })}
          <FormField id="recipient-bank" label="Bank" error={errors.recipient?.bank?.message}>
            {(controlProps) => (
              <div className="form-field-select">
                <select {...form.register('recipient.bank')} {...controlProps}>
                  <option value="" disabled>
                    Choose a bank
                  </option>
                  {banks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} aria-hidden="true" />
              </div>
            )}
          </FormField>
        </div>
      )}
    </div>
  )
}
