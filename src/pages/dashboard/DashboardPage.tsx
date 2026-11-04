import TransactionList from "./components/TransactionList";
import AccountCard from "./components/AccountCard";
import BalanceHero from "./components/BalanceHero";
import DailyLimitCard from "./components/DailyLimitCard";
import Header from "./components/Header";
import { useDashboardQueries } from "./queries";
import "./dashboard.css";

export default function DashboardPage() {
  const dashboard = useDashboardQueries();

  return (
    <>
      <a className="skip-link" href="#overview">
        Skip to dashboard
      </a>
      <Header defaultSegment={dashboard.customer.data?.customer.segment} />
      <main
        id="overview"
        className="dashboard-container dashboard-layout"
        tabIndex={-1}
      >
        <div className="dashboard-main">
          {dashboard.isError && (
            <div className="dashboard-panel dashboard-feedback">
              <p role="alert">We couldn't load your dashboard.</p>
              <button
                className="retry-button"
                type="button"
                disabled={dashboard.isFetching}
                onClick={() => void dashboard.retry()}
              >
                Retry
              </button>
            </div>
          )}
          <BalanceHero accounts={dashboard.accounts.data?.accounts} />
          <section
            className="accounts-section"
            aria-labelledby="accounts-heading"
          >
            <h2 id="accounts-heading">Accounts</h2>
            {dashboard.accounts.data ? (
              dashboard.accounts.data.accounts.length > 0 ? (
                <ul
                  className="account-list"
                  tabIndex={0}
                  aria-labelledby="accounts-heading"
                >
                  {dashboard.accounts.data.accounts.map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </ul>
              ) : (
                <p className="dashboard-caption">No accounts to show.</p>
              )
            ) : (
              <div className="accounts-placeholder" />
            )}
          </section>
          <TransactionList transactions={dashboard.transactions.data?.transactions} />
        </div>
        <DailyLimitCard customer={dashboard.customer.data?.customer} />
      </main>
    </>
  );
}
