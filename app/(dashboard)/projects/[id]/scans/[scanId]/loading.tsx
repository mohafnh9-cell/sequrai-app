import { Loader2 } from "lucide-react";

export default function ScanDetailLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      Loading scan…
    </div>
  );
}
