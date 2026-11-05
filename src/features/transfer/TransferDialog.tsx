import ReviewStep from './components/ReviewStep'
import AmountStep from './components/AmountStep'
import { useQuery } from '@tanstack/react-query'
import RecipientStep from './components/RecipientStep'
import { payeesQueryOptions } from './queries'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Account, Customer } from '@/api/types'
import { createTransferSchema } from './schema'
import type { TransferFormValues } from './schema'
import { X } from 'lucide-react'
import './TransferDialog.css'

type TransferStep = 'recipient' | 'amount' | 'review'

const steps: {
  id: TransferStep
  label: string
  title: string
  fields: FieldPath<TransferFormValues>[]
}[] = [
  {
    id: 'recipient',
    label: 'Recipient',
    title: 'Who are you sending to?',
    fields: [
      'recipientMode',
      'payeeId',
      'recipient.name',
      'recipient.accountNumber',
      'recipient.bank',
    ],
  },
  {
    id: 'amount',
    label: 'Amount',
    title: 'How much?',
    fields: ['fromAccountId', 'amount', 'note'],
  },
  { id: 'review', label: 'Review', title: 'Check the details', fields: [] },
]

interface TransferDialogProps {
  accounts: Account[]
  customer: Pick<Customer, 'dailyTransferLimit' | 'transferredToday'>
  onClose: () => void
}

export default function TransferDialog({ accounts, customer, onClose }: TransferDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState<TransferStep>('recipient')
  const payees = useQuery(payeesQueryOptions)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(step)
  const remainingDailyLimit = customer.dailyTransferLimit - customer.transferredToday
  const form = useForm<TransferFormValues>({
    resolver: zodResolver(createTransferSchema(accounts, remainingDailyLimit)),
    mode: 'onTouched',
    shouldUnregister: false,
    defaultValues: {
      recipientMode: 'saved',
      payeeId: '',
      recipient: { name: '', accountNumber: '', bank: '' },
      fromAccountId:
        accounts.find((account) => account.type === 'checking')?.id ??
        accounts.find((account) => account.type === 'savings')?.id ??
        '',
      amount: '',
      note: '',
    },
  })
  const { trigger, getValues, getFieldState } = form
  const fromAccountId = useWatch({ control: form.control, name: 'fromAccountId' })
  const currentStep = steps.find((item) => item.id === step)!

  useEffect(() => {
    if (getValues('amount') !== '' || getFieldState('amount').isTouched) {
      void trigger('amount')
    }
  }, [fromAccountId, accounts, remainingDailyLimit, getValues, getFieldState, trigger])

  useEffect(() => {
    if (previousStep.current !== step) headingRef.current?.focus()
    previousStep.current = step
  }, [step])

  async function continueToNextStep() {
    if (step === 'review') return
    if (await trigger(currentStep.fields, { shouldFocus: true, shouldTouch: true })) {
      setStep(step === 'recipient' ? 'amount' : 'review')
    }
  }

  function goBack() {
    setStep(step === 'review' ? 'amount' : 'recipient')
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="transfer-dialog"
      aria-labelledby="transfer-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <form
        className="transfer-dialog-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void continueToNextStep()
        }}
      >
        <header className="transfer-dialog-header">
          <div className="transfer-dialog-title-row">
            <h2 id="transfer-title">New transfer</h2>
            <button
              className="transfer-close"
              type="button"
              aria-label="Close transfer"
              onClick={onClose}
              autoFocus
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <ol className="transfer-stepper" aria-label="Transfer progress">
            {steps.map((item, index) => (
              <li key={item.id} aria-current={step === item.id ? 'step' : undefined}>
                <span className="transfer-step-number" aria-hidden="true">
                  {index + 1}
                </span>
                {item.label}
              </li>
            ))}
          </ol>
        </header>
        <div className="transfer-dialog-content">
          <h3 ref={headingRef} tabIndex={-1}>
            {currentStep.title}
          </h3>
          {step === 'recipient' && (
            <RecipientStep
              form={form}
              payees={payees.data?.payees}
              isPending={payees.isPending}
              isError={payees.isError}
              isFetching={payees.isFetching}
              onRetry={() => void payees.refetch()}
            />
          )}
          {step === 'amount' && (
            <AmountStep form={form} accounts={accounts} remainingDailyLimit={remainingDailyLimit} />
          )}
          {step === 'review' && (
            <ReviewStep
              values={getValues()}
              accounts={accounts}
              payees={payees.data?.payees ?? []}
            />
          )}
        </div>
        <footer className="transfer-dialog-footer">
          <button
            className="transfer-secondary"
            type="button"
            onClick={step === 'recipient' ? onClose : goBack}
          >
            {step === 'recipient' ? 'Cancel' : 'Back'}
          </button>
          <button
            className="transfer-primary"
            type={step === 'review' ? 'button' : 'submit'}
            disabled={step === 'review'}
          >
            {step === 'review' ? 'Confirm transfer' : 'Continue'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
