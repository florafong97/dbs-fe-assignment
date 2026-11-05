import { useRef } from 'react'
import { Search, X } from 'lucide-react'
import FormField from '@/components/FormField/FormField'
import './SearchInput.css'

interface SearchInputProps {
  id?: string
  label: string
  placeholder?: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export default function SearchInput({
  id,
  label,
  placeholder = label,
  value,
  onValueChange,
  disabled = false,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <FormField id={id} label={label} labelVisibility="hidden" className="search-input-field">
      {(controlProps) => (
        <div className="search-input-wrapper">
          <Search className="search-input-icon" size={18} aria-hidden="true" />
          <input
            {...controlProps}
            ref={inputRef}
            className={`${controlProps.className} search-input-control`}
            type="search"
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange(event.target.value)}
          />
          {value && (
            <button
              className="search-input-clear"
              type="button"
              aria-label="Clear search"
              disabled={disabled}
              onClick={() => {
                onValueChange('')
                inputRef.current?.focus()
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </FormField>
  )
}
