"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScanDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <AlertCircle className="mb-3 h-9 w-9 text-destructive" />
      <h1 className="font-semibold">Unable to display this scan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The page encountered an unexpected error.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" /> Projects
          </Link>
        </Button>
      </div>
    </div>
  );
}
