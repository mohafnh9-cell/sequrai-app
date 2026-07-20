export default function ProjectsLoading() {
  return (
    <div className="p-6 space-y-6 max-w-6xl animate-pulse">
      <div className="h-8 w-40 rounded bg-muted/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-40 rounded-xl bg-muted/30" />
        <div className="h-40 rounded-xl bg-muted/30" />
        <div className="h-40 rounded-xl bg-muted/30" />
      </div>
    </div>
  );
}
