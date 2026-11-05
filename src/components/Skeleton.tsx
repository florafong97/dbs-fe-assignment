import "./Skeleton.css";

export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span className={`skeleton ${className}`} aria-hidden="true">
      &nbsp;
    </span>
  );
}
