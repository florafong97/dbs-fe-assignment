import { useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import {
  DEBUG_RESOURCES,
  getDebugSearch,
  getDebugSettings,
  resetDebugOverrides,
  setDebugDelay,
  setDebugScenario,
  subscribeDebugSettings,
} from '@/api/debug'
import type { DebugResource, DebugScenario } from '@/api/debug'
import Button from '@/components/Button/Button'
import FormField from '@/components/FormField/FormField'
import './DebugPanel.css'

const labels: Record<DebugResource, string> = {
  customer: 'Customer response',
  accounts: 'Accounts response',
  transactions: 'Transactions response',
  payees: 'Payees response',
}

export default function DebugPanel({ className = '' }: { className?: string }) {
  const search = useSyncExternalStore(subscribeDebugSettings, getDebugSearch)
  const { enabled, scenarios, slow } = getDebugSettings(search)
  const queryClient = useQueryClient()
  const [isApplying, setIsApplying] = useState(false)
  if (!enabled) return null

  const overrides = DEBUG_RESOURCES.filter((resource) => scenarios[resource] !== 'normal').map(
    (resource) => `${resource}: ${scenarios[resource]}`,
  )
  if (slow) overrides.push('GET delay: 1500ms')

  async function apply(change: () => void, resources: readonly DebugResource[]) {
    change()
    setIsApplying(true)
    try {
      // Cancel old scenarios before refetching with the updated URL settings.
      await Promise.all(
        resources.map((resource) => queryClient.cancelQueries({ queryKey: [resource] })),
      )
      await Promise.all(
        resources.map((resource) => queryClient.invalidateQueries({ queryKey: [resource] })),
      )
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <details className={`debug-panel ${className}`.trim()}>
      <summary>API debug tools{overrides.length > 0 ? ' — overrides active' : ''}</summary>
      <p className="debug-panel-status" role="status">
        {isApplying ? 'Refetching GET requests…' : overrides.join(' · ') || 'No overrides active.'}
      </p>
      <fieldset className="debug-panel-controls" disabled={isApplying}>
        <legend className="visually-hidden">GET response overrides</legend>
        {DEBUG_RESOURCES.map((resource) => (
          <FormField key={resource} label={labels[resource]}>
            {(props) => (
              <div className="form-field-select">
                <select
                  {...props}
                  value={scenarios[resource]}
                  onChange={(event) => {
                    const scenario = event.target.value as DebugScenario
                    void apply(() => setDebugScenario(resource, scenario), [resource])
                  }}
                >
                  <option value="normal">Normal</option>
                  {resource !== 'customer' && <option value="empty">Empty</option>}
                  <option value="error">Error</option>
                </select>
                <ChevronDown size={18} aria-hidden="true" />
              </div>
            )}
          </FormField>
        ))}
        <FormField label="GET response delay">
          {(props) => (
            <div className="form-field-select">
              <select
                {...props}
                value={slow ? '1500' : 'normal'}
                onChange={(event) => {
                  const isSlow = event.target.value === '1500'
                  void apply(() => setDebugDelay(isSlow), DEBUG_RESOURCES)
                }}
              >
                <option value="normal">Normal (500ms)</option>
                <option value="1500">Slow (1500ms)</option>
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </div>
          )}
        </FormField>
      </fieldset>
      <div className="debug-panel-actions">
        <Button
          variant="secondary"
          disabled={isApplying}
          onClick={() => void apply(resetDebugOverrides, DEBUG_RESOURCES)}
        >
          Reset overrides
        </Button>
        <Button
          variant="secondary"
          disabled={isApplying}
          onClick={() => void apply(() => {}, DEBUG_RESOURCES)}
        >
          Refetch GETs
        </Button>
      </div>
      <p className="debug-panel-note">
        GET requests only. Transfer POSTs are unchanged. Share the current URL to reproduce these
        settings.
      </p>
    </details>
  )
}
