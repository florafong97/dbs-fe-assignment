import AccountCardSkeleton from "./components/AccountCardSkeleton";
import TransactionList from "./components/TransactionList";
import AccountCard from "./components/AccountCard";
import BalanceHero from "./components/BalanceHero";
import DailyLimitCard from "./components/DailyLimitCard";
import Header from "./components/Header";
import { useDashboardQueries } from "./queries";
import "./dashboard.css";

export default function DashboardPage() {
  const dashboard = useDashboardQueries();
  const isLoading = dashboard.isPending && !dashboard.isError;
  const accounts = isLoading ? undefined : dashboard.accounts.data?.accounts;
  const customer = isLoading ? undefined : dashboard.customer.data?.customer;
  const transactions = isLoading ? undefined : dashboard.transactions.data?.transactions;

  return (
    <>
      <a className="skip-link" href="#overview">
        Skip to dashboard
      </a>
      <Header defaultSegment={dashboard.customer.data?.customer.segment} />
      <p className="visually-hidden" role="status">
        {isLoading ? "Loading dashboard…" : dashboard.isError ? "" : "Dashboard loaded."}
      </p>
      <main
        id="overview"
        className="dashboard-container dashboard-layout"
        tabIndex={-1}
        aria-busy={isLoading}
      >
        {dashboard.isError ? (
          <div className="dashboard-feedback">
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
        ) : (
          <>
            <div className="dashboard-main">
              <BalanceHero accounts={accounts} />
              <section className="accounts-section" aria-labelledby="accounts-heading">
                <h2 id="accounts-heading">Accounts</h2>
                {accounts ? (
                  accounts.length > 0 ? (
                    <ul className="account-list" tabIndex={0} aria-labelledby="accounts-heading">
                      {accounts.map((account) => (
                        <AccountCard key={account.id} account={account} />
                      ))}
                    </ul>
                  ) : (
                    <p className="dashboard-caption">No accounts to show.</p>
                  )
                ) : (
                  <ul className="account-list" aria-hidden="true">
                    {Array.from({ length: 3 }, (_, index) => (
                      <AccountCardSkeleton key={index} />
                    ))}
                  </ul>
                )}
              </section>
              <TransactionList transactions={transactions} />
            </div>
            <DailyLimitCard customer={customer} />
          </>
        )}
      </main>
    </>
  );
}
