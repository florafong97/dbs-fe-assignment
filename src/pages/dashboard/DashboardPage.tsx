import { useDashboardQueries } from "./queries";

export default function DashboardPage() {
  const dashboard = useDashboardQueries();

  return (
    <div className="starter">
      <header className="starter-header">
        <strong>Meridian</strong>
      </header>
      <main className="starter-main">
        <h1>Dashboard</h1>
        {dashboard.isError ? (
          <div>
            <p role="alert">We couldn't load your dashboard.</p>
            <button
              type="button"
              disabled={dashboard.isFetching}
              onClick={() => void dashboard.retry()}
            >
              Retry
            </button>
          </div>
        ) : (
          <p role="status">
            {dashboard.isPending
              ? "Loading dashboard…"
              : JSON.stringify({
                  customer: dashboard.customer,
                  accounts: dashboard.accounts,
                  transactions: dashboard.transactions,
                })}
          </p>
        )}
      </main>
    </div>
  );
}
