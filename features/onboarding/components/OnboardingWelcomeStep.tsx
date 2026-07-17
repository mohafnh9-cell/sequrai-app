"use client";

import { Clock, GitBranch, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OrgSetupForm } from "@/features/organizations/components/OrgSetupForm";

export function OnboardingWelcomeStep({
  hasOrg,
  onContinue,
}: {
  hasOrg: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-3 text-center sm:text-left">
        <h2 className="text-2xl font-bold tracking-tight">Welcome to SequrAI.</h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          Before shipping anything built with AI…
          <br />
          <span className="text-foreground font-medium">Ask SequrAI.</span>
        </p>
      </div>

      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
          <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <span>
            <strong className="text-foreground">Time required:</strong> ~3 min.
          </span>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <span>No code changes will be made.</span>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
          <GitBranch className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <span>GitHub access is required to review your repository.</span>
        </li>
      </ul>

      {!hasOrg ? (
        <div className="space-y-4 rounded-xl border border-border/50 p-4">
          <div className="space-y-1">
            <Label htmlFor="workspace-hint" className="text-sm font-medium">
              Create your workspace
            </Label>
            <p className="text-xs text-muted-foreground">
              One quick step before your first Production Verdict.
            </p>
          </div>
          <OrgSetupForm />
        </div>
      ) : (
        <Button className="w-full" size="lg" onClick={onContinue}>
          Continue
        </Button>
      )}
    </div>
  );
}
