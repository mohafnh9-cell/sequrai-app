export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl animate-pulse">
      <div className="h-8 w-48 rounded bg-muted/60" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-muted/40" />
        <div className="h-24 rounded-xl bg-muted/40" />
        <div className="h-24 rounded-xl bg-muted/40" />
      </div>
      <div className="h-64 rounded-xl bg-muted/30" />
    </div>
  );
}
