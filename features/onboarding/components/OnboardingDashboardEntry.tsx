"use client";

import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingDashboardEntry() {
  const router = useRouter();

  return (
    <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Shield className="h-7 w-7 text-primary" aria-hidden />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Your first Production Verdict is ready.</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          SequrAI will continue reviewing your application as it evolves.
        </p>
      </div>
      <Button
        size="lg"
        className="w-full"
        onClick={() => {
          localStorage.setItem("sequrai_onboarding_complete", "1");
          router.push("/dashboard?firstVerdict=1");
        }}
      >
        Go to Dashboard
      </Button>
    </div>
  );
}
