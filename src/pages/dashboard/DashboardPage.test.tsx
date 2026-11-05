import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import seed from "../../../mock-api/db.json";
import { formatMoney, formatShortDate } from "../../lib/format";
import { server } from "../../test/setup";
import DashboardPage from "./DashboardPage";

const clients: QueryClient[] = [];
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
});

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

async function loaded() {
  await waitFor(() =>
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false"),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
}

// Text matchers normalize Intl's non-breaking currency space.
const money = (value: number) => formatMoney(value).replace(/\u00a0/g, " ");
const transactionSection = () =>
  screen.getByRole("region", { name: "Recent transactions" });
const rows = () => within(transactionSection()).getAllByRole("listitem");

describe("dashboard", () => {
  it("starts all requests concurrently and loads exactly eight transactions", async () => {
    const requests = new Map<string, URL>();
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get("*/api/:resource", async ({ request, params }) => {
        const resource = String(params.resource);
        requests.set(resource, new URL(request.url));
        if (requests.size === 3) release();
        await barrier;
        if (resource === "customer")
          return HttpResponse.json({ customer: seed.customer });
        if (resource === "accounts")
          return HttpResponse.json({ accounts: seed.accounts });
        return HttpResponse.json({
          transactions: seed.transactions.slice(0, 8),
          total: seed.transactions.length,
        });
      }),
    );
    renderDashboard();
    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard…");
    expect(screen.getByRole("searchbox")).toBeDisabled();
    try {
      await loaded();
      expect([...requests.keys()].sort()).toEqual([
        "accounts",
        "customer",
        "transactions",
      ]);
      expect(requests.get("transactions")?.searchParams.get("limit")).toBe("8");
      expect(rows()).toHaveLength(8);
    } finally {
      release();
    }
  });

  it("keeps the dashboard loading when one resource is slower than the others", async () => {
    let release!: () => void;
    const delayed = new Promise<void>((resolve) => {
      release = resolve;
    });
    let fastResponses = 0;
    server.use(
      http.get("*/api/customer", () => {
        fastResponses++;
        return HttpResponse.json({ customer: seed.customer });
      }),
      http.get("*/api/transactions", () => {
        fastResponses++;
        return HttpResponse.json({ transactions: [], total: 0 });
      }),
      http.get("*/api/accounts", async () => {
        await delayed;
        return HttpResponse.json({ accounts: seed.accounts });
      }),
    );
    renderDashboard();
    try {
      await waitFor(() => expect(fastResponses).toBe(2));
      expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
      expect(
        screen.queryByText("No transactions yet."),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Everyday Checking")).not.toBeInTheDocument();
      expect(screen.getByRole("searchbox")).toBeDisabled();
    } finally {
      release();
    }
    await loaded();
    expect(screen.getByText("Everyday Checking")).toBeInTheDocument();
    expect(screen.getByText("No transactions yet.")).toBeInTheDocument();
  });

  it("shows deposit-only total, masked account balances and remaining daily limit", async () => {
    server.use(
      http.get("*/api/customer", () =>
        HttpResponse.json({
          customer: { ...seed.customer, transferredToday: 120 },
        }),
      ),
    );
    renderDashboard();
    await loaded();
    expect(
      screen.getByRole("region", { name: "Total available" }),
    ).toHaveTextContent(money(17120.55));
    expect(screen.getByText("Across 2 deposit accounts")).toBeInTheDocument();
    const accounts = within(
      screen.getByRole("list", { name: "Accounts" }),
    ).getAllByRole("listitem");
    expect(accounts).toHaveLength(3);
    seed.accounts.forEach((account, index) => {
      expect(accounts[index]).toHaveTextContent(account.name);
      expect(accounts[index]).toHaveTextContent(account.maskedNumber);
      expect(accounts[index]).toHaveTextContent(money(account.balance));
    });
    expect(accounts[2]).toHaveTextContent("Amount due");
    expect(
      screen.getByRole("complementary", { name: "Daily limit" }),
    ).toHaveTextContent(money(4880));
  });

  it("renders the eight newest transactions with direction, dates and pending status", async () => {
    renderDashboard();
    await loaded();
    expect(rows()).toHaveLength(8);
    seed.transactions.slice(0, 8).forEach((transaction, index) => {
      const row = rows()[index];
      expect(row).toHaveTextContent(transaction.description);
      expect(row).toHaveTextContent(transaction.category);
      expect(row).toHaveTextContent(formatShortDate(transaction.date));
      expect(row).toHaveTextContent(
        transaction.direction === "in"
          ? `+${money(transaction.amount)}`
          : money(-transaction.amount),
      );
      expect(within(row).queryByText("Pending") !== null).toBe(
        transaction.status === "pending",
      );
    });
  });

  it("shows Singapore dates across midnight and zero amounts without a negative sign for incoming money", async () => {
    server.use(
      http.get("*/api/transactions", () =>
        HttpResponse.json({
          transactions: [
            {
              ...seed.transactions[0],
              date: "2026-10-18T18:30:00Z",
              amount: 0,
              direction: "in",
            },
          ],
          total: 1,
        }),
      ),
    );
    renderDashboard();
    await loaded();
    expect(rows()[0]).toHaveTextContent("19 Oct");
    expect(rows()[0]).toHaveTextContent(`+${money(0)}`);
  });

  it("filters description OR category without case sensitivity and clears with the keyboard", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await loaded();
    const search = screen.getByRole("searchbox", {
      name: "Search transactions",
    });
    await user.type(search, "  FAIRprice  ");
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent("FairPrice Finest");
    expect(screen.getByText("1 result match your search")).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "INCOME");
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent("Salary — Northwind Labs");
    await user.tab();
    expect(screen.getByRole("button", { name: "Clear search" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(search).toHaveValue("");
    expect(rows()).toHaveLength(8);
    await user.type(search, "   ");
    expect(rows()).toHaveLength(8);
  });

  it("reports plural match counts and restores results from a no-match state", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await loaded();
    const search = screen.getByRole("searchbox");
    await user.type(search, "o");
    expect(rows().length).toBeGreaterThan(1);
    expect(
      screen.getByText(`${rows().length} results match your search`),
    ).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "no-such-transaction");
    const emptyMessage = screen.getByText("No transactions match your search.");
    expect(emptyMessage).toBeInTheDocument();
    expect(
      within(transactionSection()).queryByRole("list"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("0 results match your search")).toBeInTheDocument();
    await user.click(
      within(emptyMessage.parentElement!).getByRole("button", { name: "Clear search" }),
    );
    expect(rows()).toHaveLength(8);
  });

  it("handles empty accounts and transactions without treating them as loading", async () => {
    server.use(
      http.get("*/api/accounts", () => HttpResponse.json({ accounts: [] })),
      http.get("*/api/transactions", () =>
        HttpResponse.json({ transactions: [], total: 0 }),
      ),
    );
    renderDashboard();
    await loaded();
    expect(screen.getByText("No accounts to show.")).toBeInTheDocument();
    expect(screen.getByText("No transactions yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Total available" }),
    ).toHaveTextContent(money(0));
    expect(screen.getByText("Across 0 deposit accounts")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeEnabled();
  });

  it("handles zero deposit balances and an exhausted daily limit", async () => {
    server.use(
      http.get("*/api/accounts", () =>
        HttpResponse.json({
          accounts: seed.accounts.map((account) =>
            account.type === "credit" ? account : { ...account, balance: 0 },
          ),
        }),
      ),
      http.get("*/api/customer", () =>
        HttpResponse.json({
          customer: { ...seed.customer, transferredToday: 5000 },
        }),
      ),
    );
    renderDashboard();
    await loaded();
    expect(
      screen.getByRole("region", { name: "Total available" }),
    ).toHaveTextContent(money(0));
    expect(
      screen.getByRole("complementary", { name: "Daily limit" }),
    ).toHaveTextContent(money(0));
  });

  it.each(["customer", "accounts", "transactions"])(
    "recovers from a failed %s request on Retry",
    async (resource) => {
      const user = userEvent.setup();
      server.use(
        http.get(
          `*/api/${resource}`,
          () =>
            HttpResponse.json(
              { error: { code: "INTERNAL_ERROR", message: "Down" } },
              { status: 500 },
            ),
          { once: true },
        ),
      );
      renderDashboard();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "We couldn't load your dashboard.",
      );
      expect(
        screen.queryByRole("region", { name: "Total available" }),
      ).not.toBeInTheDocument();
      const retry = screen.getByRole("button", { name: "Retry" });
      await waitFor(() => expect(retry).toBeEnabled());
      await user.click(retry);
      await loaded();
      expect(screen.getByText("Everyday Checking")).toBeInTheDocument();
      expect(rows()).toHaveLength(8);
    },
  );

  it("keeps showing the error when Retry also fails", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.get("*/api/accounts", () => {
        attempts++;
        return HttpResponse.error();
      }),
    );
    renderDashboard();
    await screen.findByRole("alert");
    const retry = screen.getByRole("button", { name: "Retry" });
    await waitFor(() => expect(retry).toBeEnabled());
    await user.click(retry);
    await waitFor(() => expect(attempts).toBe(2));
    await waitFor(() => expect(retry).toBeEnabled());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load your dashboard.",
    );
    expect(screen.queryByText("Everyday Checking")).not.toBeInTheDocument();
  });
});
