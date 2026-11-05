import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Account, Customer } from '@/api/types'
import { ApiError } from '@/api/client'
import { toTransferPayload } from './payload'
import { useTransferSubmission } from './queries'
import { createTransferSchema } from './schema'
import type { TransferFormValues } from './schema'
import { steps } from './steps'
import type { TransferStep } from './steps'

const GENERIC_SEND_ERROR = "Something went wrong. Your money hasn't left your account."
const DEFAULT_SEND_ERROR = `${GENERIC_SEND_ERROR} Try again.`

export function useTransferForm(
  accounts: Account[],
  customer: Pick<Customer, 'dailyTransferLimit' | 'transferredToday'>,
) {
  const sendingRef = useRef(false)
  const [step, setStep] = useState<TransferStep>('recipient')
  const [invalidField, setInvalidField] = useState<FieldPath<TransferFormValues> | null>(null)
  const { transfer, refresh } = useTransferSubmission()
  // The mock's generic error omits "Try again."; render the required copy once.
  const sendErrorMessage =
    transfer.error instanceof ApiError &&
    transfer.error.message &&
    transfer.error.message !== GENERIC_SEND_ERROR
      ? transfer.error.message
      : DEFAULT_SEND_ERROR
  const canClose = !transfer.isPending && (!transfer.isSuccess || refresh.isSuccess)
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

  async function continueToNextStep() {
    if (step === 'review' || transfer.isPending || transfer.isSuccess) return
    if (await trigger(currentStep.fields, { shouldFocus: true, shouldTouch: true })) {
      setInvalidField(null)
      setStep(step === 'recipient' ? 'amount' : 'review')
    }
  }

  function goBack() {
    if (transfer.isError) transfer.reset()
    setInvalidField(null)
    setStep(step === 'review' ? 'amount' : 'recipient')
  }

  function canDismiss() {
    return canClose && !sendingRef.current
  }

  async function confirmTransfer() {
    // Lock before async validation to reject rapid duplicate clicks.
    if (sendingRef.current || transfer.isPending || transfer.isSuccess) return
    sendingRef.current = true
    try {
      if (!(await trigger(undefined, { shouldTouch: true }))) {
        const invalidStep = steps.find((item) =>
          item.fields.some((field) => getFieldState(field).invalid),
        )
        if (invalidStep) {
          setInvalidField(invalidStep.fields.find((field) => getFieldState(field).invalid) ?? null)
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

  return {
    form,
    step,
    currentStep,
    invalidField,
    remainingDailyLimit,
    transfer,
    sendErrorMessage,
    refresh,
    canClose,
    canDismiss,
    continueToNextStep,
    goBack,
    confirmTransfer,
  }
}
