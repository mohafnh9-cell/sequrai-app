"use client";

import { useEffect } from "react";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startGitHubOAuth } from "@/lib/github/oauth-client";

export function OnboardingGitHubStep({
  onConnected,
}: {
  onConnected: () => void;
}) {
  useEffect(() => {
    const pending = localStorage.getItem("sequrai_github_connect");
    if (pending) {
      localStorage.removeItem("sequrai_github_connect");
      queueMicrotask(() => onConnected());
    }
  }, [onConnected]);

  const connect = async () => {
    localStorage.setItem("sequrai_github_connect", "1");
    await startGitHubOAuth("/onboarding?step=github");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Connect GitHub</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          SequrAI reviews your repositories and produces a Production Verdict.
        </p>
      </div>

      <Button className="w-full gap-2" size="lg" onClick={() => void connect()}>
        <GitBranch className="h-4 w-4" aria-hidden />
        Connect GitHub
      </Button>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">View access scopes</summary>
        <p className="mt-2 pl-1">
          SequrAI requests read access to your repositories and webhook permissions to review code on
          push. SequrAI never modifies your code or deploys your application.
        </p>
      </details>
    </div>
  );
}
