/* Shown instantly on every click inside the workspace, so nothing ever feels frozen. */
export function PageLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded bg-mist" />
      <div className="h-4 w-80 max-w-full rounded bg-mist" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-[var(--radius-lg)] bg-mist" />)}</div>
      <div className="h-64 rounded-[var(--radius-lg)] bg-mist" />
    </div>
  );
}
