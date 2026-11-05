export function parseAmountInput(value: string): number | null {
  const input = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) return null
  const amount = Number(input)
  return Number.isFinite(amount) ? amount : null
}

export function formatAmountInput(value: string): string {
  if (parseAmountInput(value) === null) return value
  const [whole, fraction = ''] = value.trim().split('.')
  // Pad the original decimal text rather than rounding a floating-point value.
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`
}
