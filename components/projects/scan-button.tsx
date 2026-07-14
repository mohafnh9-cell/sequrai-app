"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScanButtonProps {
  projectId: string;
  fullWidth?: boolean;
}

export function ScanButton({ projectId, fullWidth }: ScanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleScan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) throw new Error("Scan failed");

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.refresh();
      }, 2000);
    } catch {
      // Error handled silently — UI shows loading state reset
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleScan}
      disabled={loading}
      variant={success ? "secondary" : "default"}
      size="sm"
      className={cn(
        "gap-2 text-sm",
        fullWidth && "w-full justify-start"
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : success ? (
        <Zap className="h-4 w-4 text-green-500" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {loading ? "Scanning..." : success ? "Scan complete!" : "Run Security Scan"}
    </Button>
  );
}
