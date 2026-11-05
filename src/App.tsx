import { useState } from 'react'
import TransferDialog from '@/features/transfer/TransferDialog'
import Header from './components/Header/Header'
import DashboardPage from './pages/dashboard/DashboardPage'
import { useDashboardQueries } from './pages/dashboard/queries'
import { usePreferences } from './theme/usePreferences'

export default function App() {
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const dashboard = useDashboardQueries()
  const preferences = usePreferences(dashboard.customer.data?.customer.segment)

  return (
    <>
      <a className="skip-link" href="#overview">
        Skip to dashboard
      </a>
      <Header
        theme={preferences.theme}
        segment={preferences.segment}
        onToggleTheme={preferences.toggleTheme}
        onSelectSegment={preferences.selectSegment}
      />
      <DashboardPage
        customer={dashboard.customer.data?.customer}
        accounts={dashboard.accounts.data?.accounts}
        transactions={dashboard.transactions.data?.transactions}
        isPending={dashboard.isPending}
        isError={dashboard.isError}
        isFetching={dashboard.isFetching}
        onRetry={() => void dashboard.retry()}
        onNewTransfer={() => setIsTransferOpen(true)}
      />
      {isTransferOpen && dashboard.accounts.data && dashboard.customer.data && (
        <TransferDialog
          accounts={dashboard.accounts.data.accounts}
          customer={dashboard.customer.data.customer}
          onClose={() => setIsTransferOpen(false)}
        />
      )}
    </>
  )
}
