"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import {
  type OnboardingContext,
  type WizardStep,
  parseLegacyStepParam,
  parseWizardStep,
  resolveInitialWizardStep,
  shouldSkipGitHubStep,
} from "../onboarding-flow";
import { OnboardingProgressTracker } from "./OnboardingProgressTracker";
import { VendorLockInNotice } from "./VendorLockInNotice";
import { OnboardingWelcomeStep } from "./OnboardingWelcomeStep";
import { OnboardingGitHubStep } from "./OnboardingGitHubStep";
import { OnboardingRepoPicker } from "./OnboardingRepoPicker";
import { OnboardingReviewStep } from "./OnboardingReviewStep";
import { OnboardingVerdictReveal } from "./OnboardingVerdictReveal";
import { OnboardingFastestPath } from "./OnboardingFastestPath";
import { OnboardingEngineerStep } from "./OnboardingEngineerStep";
import { OnboardingDashboardEntry } from "./OnboardingDashboardEntry";

type FlowState = {
  projectId: string | null;
  scanId: string | null;
  verdict: ProductionVerdictV1 | null;
};

function normalizeStep(
  step: WizardStep,
  context: OnboardingContext,
  projectId: string | null
): WizardStep {
  if (step === "github" && shouldSkipGitHubStep(context)) return "repository";
  if (step === "review" && !projectId) return "repository";
  return step;
}

export function OnboardingFlow({ initialContext }: { initialContext: OnboardingContext }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const forcedStep =
    parseWizardStep(searchParams.get("step")) ??
    parseLegacyStepParam(searchParams.get("step"));

  const paramProjectId = searchParams.get("projectId");

  const [context, setContext] = useState(initialContext);
  const [rawStep, setRawStep] = useState<WizardStep>(() =>
    resolveInitialWizardStep(initialContext, forcedStep)
  );
  const [flow, setFlow] = useState<FlowState>(() => ({
    projectId:
      paramProjectId ??
      initialContext.projects[0]?.id ??
      initialContext.latestCompletedScan?.projectId ??
      initialContext.activeScan?.projectId ??
      null,
    scanId: initialContext.latestCompletedScan?.id ?? initialContext.activeScan?.id ?? null,
    verdict: initialContext.latestVerdict,
  }));

  const step = useMemo(
    () => normalizeStep(rawStep, context, flow.projectId),
    [rawStep, context, flow.projectId]
  );

  const progressContext = useMemo(
    () => ({
      githubConnected: context.githubConnected || step !== "welcome",
      projects: flow.projectId
        ? [
            {
              id: flow.projectId,
              name: "",
              githubRepo: null,
              defaultBranch: null,
              isPrivate: null,
              updatedAt: null,
            },
            ...context.projects,
          ]
        : context.projects,
      activeScan: context.activeScan,
      latestCompletedScan: flow.scanId
        ? {
            id: flow.scanId,
            projectId: flow.projectId ?? "",
            status: "completed",
            progress: 100,
            progressMessage: null,
          }
        : context.latestCompletedScan,
      latestVerdict: flow.verdict ?? context.latestVerdict,
    }),
    [context, flow, step]
  );

  const goTo = useCallback(
    (next: WizardStep) => {
      setRawStep(next);
      router.replace(`/onboarding?step=${next}`, { scroll: false });
    },
    [router]
  );

  const handleGitHubConnected = useCallback(() => {
    setContext((prev) => ({ ...prev, githubConnected: true }));
    goTo("repository");
  }, [goTo]);

  const handleRepositoryConnected = useCallback(
    (projectId: string) => {
      setFlow((prev) => ({ ...prev, projectId }));
      setContext((prev) => ({
        ...prev,
        projects: prev.projects.some((p) => p.id === projectId)
          ? prev.projects
          : [
              {
                id: projectId,
                name: "Connected repository",
                githubRepo: null,
                defaultBranch: null,
                isPrivate: null,
                updatedAt: null,
              },
              ...prev.projects,
            ],
      }));
      goTo("review");
    },
    [goTo]
  );

  const handleReviewComplete = useCallback(
    (scanId: string, verdict: ProductionVerdictV1) => {
      setFlow((prev) => ({ ...prev, scanId, verdict }));
      setContext((prev) => ({ ...prev, latestVerdict: verdict, isComplete: true }));
      goTo("verdict");
    },
    [goTo]
  );

  return (
    <div className="w-full max-w-xl space-y-8">
      {step !== "dashboard" && (
        <OnboardingProgressTracker wizardStep={step} context={progressContext} />
      )}

      {step === "welcome" && (
        <OnboardingWelcomeStep
          hasOrg={context.hasOrg}
          onContinue={() => goTo(context.githubConnected ? "repository" : "github")}
        />
      )}

      {step === "github" && <OnboardingGitHubStep onConnected={handleGitHubConnected} />}

      {step === "repository" && (
        <OnboardingRepoPicker onRepositoryConnected={handleRepositoryConnected} />
      )}

      {step === "review" && flow.projectId && (
        <OnboardingReviewStep
          projectId={flow.projectId}
          existingScanId={flow.scanId}
          onComplete={handleReviewComplete}
        />
      )}

      {step === "verdict" && flow.verdict && (
        <OnboardingVerdictReveal verdict={flow.verdict} onContinue={() => goTo("roadmap")} />
      )}

      {step === "roadmap" && flow.verdict && (
        <OnboardingFastestPath
          priorities={flow.verdict.topPriorities}
          onContinue={() => goTo("engineer")}
        />
      )}

      {step === "engineer" && flow.verdict && flow.scanId && flow.projectId && (
        <OnboardingEngineerStep
          scanId={flow.scanId}
          verdict={flow.verdict}
          projectId={flow.projectId}
          onContinue={() => goTo("dashboard")}
        />
      )}

      {step === "dashboard" && <OnboardingDashboardEntry />}

      {step !== "dashboard" && step !== "review" && <VendorLockInNotice />}
    </div>
  );
}
