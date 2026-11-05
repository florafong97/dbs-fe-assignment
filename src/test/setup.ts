import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { handlers, resetMockDb } from '@/mocks/handlers'

export const server = setupServer(...handlers)

// jsdom has no scrolling/layout implementation.
Element.prototype.scrollIntoView = vi.fn()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetMockDb()
  localStorage.clear()
  document.documentElement.dataset.theme = 'light'
  document.documentElement.dataset.segment = 'retail'
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
