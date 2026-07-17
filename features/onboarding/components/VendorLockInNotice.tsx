export function VendorLockInNotice({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`rounded-xl border border-border/50 bg-secondary/30 p-4 text-sm text-muted-foreground ${className}`}
      aria-label="SequrAI control policy"
    >
      <p className="font-medium text-foreground text-xs uppercase tracking-wide mb-2">
        You always remain in control
      </p>
      <p className="mb-2">SequrAI never:</p>
      <ul className="space-y-1 list-disc pl-5">
        <li>Deploys your application</li>
        <li>Modifies your code</li>
        <li>Merges Pull Requests</li>
        <li>Makes production changes</li>
      </ul>
    </aside>
  );
}
