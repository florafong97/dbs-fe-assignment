import type { ComponentPropsWithoutRef } from 'react'
import './Chip.css'

type ChipProps = ComponentPropsWithoutRef<'span'> & {
  tone: 'warning' | 'danger'
}

export default function Chip({ tone, className = '', ...props }: ChipProps) {
  return <span {...props} className={`chip chip--${tone} ${className}`.trim()} />
}
