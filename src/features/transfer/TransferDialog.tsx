import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import './TransferDialog.css'

export default function TransferDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
          {['Recipient', 'Amount', 'Review'].map((label, index) => (
            <li key={label} aria-current={index === 0 ? 'step' : undefined}>
              <span className="transfer-step-number" aria-hidden="true">
                {index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      </header>
      <div className="transfer-dialog-content">
        <h3>Who are you sending to?</h3>
      </div>
      <footer className="transfer-dialog-footer">
        <button className="transfer-secondary" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="transfer-primary" type="button" disabled>
          Continue
        </button>
      </footer>
    </dialog>
  )
}
