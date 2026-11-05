import Skeleton from "../../../components/Skeleton";

export default function AccountCardSkeleton() {
  return (
    <li className="dashboard-panel account-card" aria-hidden="true">
      <Skeleton className="account-icon skeleton-icon" />
      <h3>
        <Skeleton />
      </h3>
      <p className="account-number">
        <Skeleton className="skeleton-short" />
      </p>
      <p className="account-balance">
        <Skeleton />
      </p>
      <p className="account-label">
        <Skeleton className="skeleton-short" />
      </p>
    </li>
  );
}
