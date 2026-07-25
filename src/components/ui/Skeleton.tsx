export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-container-high dark:bg-zinc-800 ${className}`}
    />
  );
}
