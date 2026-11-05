import { afterAll, beforeAll } from 'vitest'

// jsdom has no native modal behaviour. Model open/close and its queued event;
// light dismissal, focus containment and layout require browser checks.
export function setupDialogMock() {
  const originalShowModal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  )
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '')
      },
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        if (!this.open) return
        this.removeAttribute('open')
        queueMicrotask(() => this.dispatchEvent(new Event('close')))
      },
    })
  })
  afterAll(() => {
    for (const [name, descriptor] of [
      ['showModal', originalShowModal],
      ['close', originalClose],
    ] as const) {
      if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
      else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
    }
  })
}
