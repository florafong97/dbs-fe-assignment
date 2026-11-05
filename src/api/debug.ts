export const DEBUG_RESOURCES = ['customer', 'accounts', 'transactions', 'payees'] as const
export type DebugResource = (typeof DEBUG_RESOURCES)[number]
export type DebugScenario = 'normal' | 'empty' | 'error'

const DEBUG_CHANGE_EVENT = 'meridian-debug-change'

export function getDebugSearch() {
  return typeof window === 'undefined' ? '' : window.location.search
}

export function getDebugSettings(search = getDebugSearch()) {
  const params = new URLSearchParams(search)
  const enabled = params.get('debug') === '1'
  const scenarios: Record<DebugResource, DebugScenario> = {
    customer: 'normal',
    accounts: 'normal',
    transactions: 'normal',
    payees: 'normal',
  }
  if (enabled) {
    for (const resource of DEBUG_RESOURCES) {
      const value = params.get(`debug-${resource}`)
      if (value === 'error' || (value === 'empty' && resource !== 'customer')) {
        scenarios[resource] = value
      }
    }
  }
  return { enabled, scenarios, slow: enabled && params.get('debug-delay') === '1500' }
}

export function withDebugParams(path: string, resource: DebugResource) {
  const { enabled, scenarios, slow } = getDebugSettings()
  if (!enabled) return path
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  if (scenarios[resource] !== 'normal') params.set('scenario', scenarios[resource])
  if (slow) params.set('delay', '1500')
  return `${pathname}${params.size ? `?${params}` : ''}`
}

export function subscribeDebugSettings(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(DEBUG_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(DEBUG_CHANGE_EVENT, onChange)
  }
}

function updateDebugUrl(change: (params: URLSearchParams) => void) {
  const url = new URL(window.location.href)
  change(url.searchParams)
  window.history.replaceState(window.history.state, '', url)
  window.dispatchEvent(new Event(DEBUG_CHANGE_EVENT))
}

export function setDebugScenario(resource: DebugResource, scenario: DebugScenario) {
  updateDebugUrl((params) => {
    if (scenario === 'normal') params.delete(`debug-${resource}`)
    else params.set(`debug-${resource}`, scenario)
  })
}

export function setDebugDelay(slow: boolean) {
  updateDebugUrl((params) => {
    if (slow) params.set('debug-delay', '1500')
    else params.delete('debug-delay')
  })
}

export function resetDebugOverrides() {
  updateDebugUrl((params) => {
    for (const resource of DEBUG_RESOURCES) params.delete(`debug-${resource}`)
    params.delete('debug-delay')
  })
}
