import Button from '@/components/Button/Button'
import SuccessPanel from './components/SuccessPanel'
import TransferStepper from './components/TransferStepper'
import ReviewStep from './components/ReviewStep'
import AmountStep from './components/AmountStep'
import { useQuery } from '@tanstack/react-query'
import RecipientStep from './components/RecipientStep'
import { payeesQueryOptions } from './queries'
import { steps } from './steps'
import { useTransferForm } from './useTransferForm'
import { useEffect, useRef } from 'react'
import type { Account, Customer } from '@/api/types'
import { X } from 'lucide-react'
import './TransferDialog.css'

interface TransferDialogProps {
  accounts: Account[]
  customer: Pick<Customer, 'dailyTransferLimit' | 'transferredToday'>
  onClose: () => void
}

export default function TransferDialog({ accounts, customer, onClose }: TransferDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const {
    form,
    step,
    currentStep,
    invalidField,
    remainingDailyLimit,
    transfer,
    refresh,
    canClose,
    canDismiss,
    continueToNextStep,
    goBack,
    confirmTransfer,
  } = useTransferForm(accounts, customer)
  const payees = useQuery(payeesQueryOptions)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(step)

  useEffect(() => {
    if (previousStep.current !== step) {
      if (invalidField) form.setFocus(invalidField)
      else headingRef.current?.focus()
    }
    previousStep.current = step
  }, [step, form, invalidField])

  function closeDialog() {
    if (canDismiss()) dialogRef.current?.close()
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
          {!transfer.isSuccess && <TransferStepper steps={steps} activeStep={step} />}
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
                  values={form.getValues()}
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
            <Button
              variant="secondary"
              onClick={step === 'recipient' ? closeDialog : goBack}
              disabled={transfer.isPending}
            >
              {step === 'recipient' ? 'Cancel' : 'Back'}
            </Button>
            <Button variant="primary" type="submit" disabled={transfer.isPending}>
              {transfer.isPending
                ? 'Sending…'
                : step === 'review'
                  ? 'Confirm transfer'
                  : 'Continue'}
            </Button>
          </footer>
        )}
      </form>
    </dialog>
  )
}
