import './TransferStepper.css'

interface TransferStepperProps {
  steps: readonly { id: string; label: string }[]
  activeStep: string
}

export default function TransferStepper({ steps, activeStep }: TransferStepperProps) {
  return (
    <ol className="transfer-stepper" aria-label="Transfer progress">
      {steps.map((step, index) => (
        <li key={step.id} aria-current={activeStep === step.id ? 'step' : undefined}>
          <span className="transfer-step-number" aria-hidden="true">
            {index + 1}
          </span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}
