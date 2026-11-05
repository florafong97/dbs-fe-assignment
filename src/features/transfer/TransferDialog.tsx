import SuccessPanel from './components/SuccessPanel'
import { ApiError } from '@/api/client'
import { toTransferPayload } from './payload'
import ReviewStep from './components/ReviewStep'
import AmountStep from './components/AmountStep'
import { useQuery } from '@tanstack/react-query'
import RecipientStep from './components/RecipientStep'
import { payeesQueryOptions, useTransferSubmission } from './queries'
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
  const sendingRef = useRef(false)
  const invalidFieldRef = useRef<FieldPath<TransferFormValues> | null>(null)
  const { transfer, refresh } = useTransferSubmission()
  const canClose = !transfer.isPending && (!transfer.isSuccess || refresh.isSuccess)
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
    if (!transfer.isSuccess && (getValues('amount') !== '' || getFieldState('amount').isTouched)) {
      void trigger('amount')
    }
  }, [
    fromAccountId,
    accounts,
    remainingDailyLimit,
    getValues,
    getFieldState,
    trigger,
    transfer.isSuccess,
  ])

  useEffect(() => {
    if (previousStep.current !== step) {
      if (invalidFieldRef.current) {
        form.setFocus(invalidFieldRef.current)
        invalidFieldRef.current = null
      } else headingRef.current?.focus()
    }
    previousStep.current = step
  }, [step, form])

  async function continueToNextStep() {
    if (step === 'review' || transfer.isPending || transfer.isSuccess) return
    if (await trigger(currentStep.fields, { shouldFocus: true, shouldTouch: true })) {
      setStep(step === 'recipient' ? 'amount' : 'review')
    }
  }

  function goBack() {
    if (transfer.isError) transfer.reset()
    setStep(step === 'review' ? 'amount' : 'recipient')
  }

  function closeDialog() {
    if (canClose && !sendingRef.current) dialogRef.current?.close()
  }

  async function confirmTransfer() {
    // Lock synchronously, before async validation, to reject rapid duplicate clicks.
    if (sendingRef.current || transfer.isPending || transfer.isSuccess) return
    sendingRef.current = true
    try {
      if (!(await trigger(undefined, { shouldTouch: true }))) {
        const invalidStep = steps.find((item) =>
          item.fields.some((field) => getFieldState(field).invalid),
        )
        if (invalidStep) {
          invalidFieldRef.current =
            invalidStep.fields.find((field) => getFieldState(field).invalid) ?? null
          setStep(invalidStep.id)
        }
        return
      }
      await transfer.mutateAsync(toTransferPayload(getValues()))
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [name, message] of Object.entries(error.fields ?? {})) {
          const field = steps.flatMap((item) => item.fields).find((path) => path === name)
          if (field) form.setError(field, { type: 'server', message })
        }
      }
    } finally {
      sendingRef.current = false
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    dialog.querySelector<HTMLButtonElement>('.transfer-close')?.focus()
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
      closedby={canClose ? 'any' : 'none'}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose()
      }}
    >
      <form
        className="transfer-dialog-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (step === 'review') void confirmTransfer()
          else void continueToNextStep()
        }}
      >
        <header className="transfer-dialog-header">
          <div className="transfer-dialog-title-row">
            <h2 id="transfer-title">New transfer</h2>
            <button
              className="transfer-close"
              type="button"
              aria-label="Close transfer"
              onClick={closeDialog}
              disabled={!canClose}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {!transfer.isSuccess && (
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
          )}
        </header>
        <div className="transfer-dialog-content">
          {transfer.isSuccess && transfer.data ? (
            <SuccessPanel
              transfer={transfer.data.transfer}
              isRefreshing={refresh.isPending}
              refreshFailed={refresh.isError}
              canReturn={refresh.isSuccess}
              onRetryRefresh={() => refresh.mutate()}
              onReturn={closeDialog}
            />
          ) : (
            <>
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
                <AmountStep
                  form={form}
                  accounts={accounts}
                  remainingDailyLimit={remainingDailyLimit}
                />
              )}
              {step === 'review' && (
                <ReviewStep
                  values={getValues()}
                  accounts={accounts}
                  payees={payees.data?.payees ?? []}
                />
              )}

              {transfer.isError && (
                <div className="transfer-send-error" role="alert">
                  <p>Something went wrong. Your money hasn't left your account. Try again.</p>
                  <p>{transfer.error.message}</p>
                </div>
              )}
            </>
          )}
        </div>
        {!transfer.isSuccess && (
          <footer className="transfer-dialog-footer">
            <button
              className="transfer-secondary"
              type="button"
              onClick={step === 'recipient' ? closeDialog : goBack}
              disabled={transfer.isPending}
            >
              {step === 'recipient' ? 'Cancel' : 'Back'}
            </button>
            <button className="transfer-primary" type="submit" disabled={transfer.isPending}>
              {transfer.isPending
                ? 'Sending…'
                : step === 'review'
                  ? 'Confirm transfer'
                  : 'Continue'}
            </button>
          </footer>
        )}
      </form>
    </dialog>
  )
}
