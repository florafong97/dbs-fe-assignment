import { Search, X } from "lucide-react";
import { useState } from "react";
import type { Transaction } from "../../../api/types";
import { formatMoney, formatShortDate } from "../../../lib/format";

export default function TransactionList({
  transactions,
}: {
  transactions?: Transaction[];
}) {
  const [search, setSearch] = useState("");
  const [isPointerFocus, setIsPointerFocus] = useState(false);
  const query = search.trim().toLowerCase();
  // Search only the eight loaded rows: immediate results without extra requests.
  const matches = transactions?.filter(
    (transaction) =>
      transaction.description.toLowerCase().includes(query) ||
      transaction.category.toLowerCase().includes(query),
  );

  return (
    <section
      className="transactions-section"
      aria-labelledby="transactions-heading"
    >
      <div className="transactions-header">
        <h2 id="transactions-heading">Recent transactions</h2>
        <div className="transaction-search">
          <Search size={18} aria-hidden="true" />
          <input
            id="transaction-search"
            type="search"
            data-pointer-focus={isPointerFocus}
            onPointerDown={() => setIsPointerFocus(true)}
            onBlur={() => setIsPointerFocus(false)}
            aria-label="Search transactions"
            placeholder="Search transactions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="dashboard-panel transactions-card">
        {matches === undefined ? (
          <p className="dashboard-caption" role="status">
            Loading transactions…
          </p>
        ) : (
          <>
            {query && (
              <p className="transaction-count" role="status">
                `${matches.length} $
                {matches.length === 1 ? "result" : "results"} match your search`
              </p>
            )}
            {matches.length > 0 ? (
              <ul className="transaction-list">
                {matches.map((transaction) => (
                  <li key={transaction.id} className="transaction-row">
                    <div className="transaction-details">
                      <p className="transaction-description">
                        {transaction.description}
                      </p>
                      <p className="transaction-meta">
                        <span className="transaction-category">
                          {transaction.category}
                        </span>
                        {" · "}
                        <time dateTime={transaction.date}>
                          {formatShortDate(transaction.date)}
                        </time>
                      </p>
                    </div>
                    <div className="transaction-value">
                      <p
                        className={`transaction-amount amount${transaction.direction === "in" ? " transaction-incoming" : ""}`}
                      >
                        {transaction.direction === "in"
                          ? `+${formatMoney(transaction.amount)}`
                          : formatMoney(-transaction.amount)}
                      </p>
                      {transaction.status === "pending" && (
                        <span className="pending-chip">Pending</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="transactions-empty">
                <p>
                  {query
                    ? "No transactions match your search."
                    : "No transactions yet."}
                </p>
                {query && (
                  <button
                    className="clear-search-button"
                    type="button"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
