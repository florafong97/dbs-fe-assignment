import { useId } from 'react'
import type { ReactNode } from 'react'
import './FormField.css'

type FieldControlProps = {
  id: string
  className: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

interface FormFieldProps {
  id?: string
  label: string
  labelVisibility?: 'visible' | 'hidden'
  error?: string
  className?: string
  children: (props: FieldControlProps) => ReactNode
}

export default function FormField({
  id,
  label,
  labelVisibility = 'visible',
  error,
  className = '',
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const errorId = `${controlId}-error`

  return (
    <div className={`form-field ${className}`}>
      <label
        htmlFor={controlId}
        className={labelVisibility === 'hidden' ? 'form-field-label-hidden' : undefined}
      >
        {label}
      </label>
      {children({
        id: controlId,
        className: 'form-field-control',
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })}
      {error && (
        <p className="form-field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
