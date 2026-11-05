// The supplied API charges no fee. Keep review and validation in sync here.
export const TRANSFER_FEE = 0

export function calculateTransferTotal(amount: number, fee = TRANSFER_FEE): number {
  return (Math.round(amount * 100) + Math.round(fee * 100)) / 100
}
