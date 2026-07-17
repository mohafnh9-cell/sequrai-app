"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductionEngineerSummary } from "@/features/production-verdict/components/ProductionEngineerSummary";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import { useI18n } from "@/lib/i18n/client";

export function OnboardingEngineerStep({
  scanId,
  verdict,
  projectId,
  onContinue,
}: {
  scanId: string;
  verdict: ProductionVerdictV1;
  projectId: string;
  onContinue: () => void;
}) {
  const { t } = useI18n("onboarding");
  const { t: tc } = useI18n("common");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-xl font-semibold">{t("engineerTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("engineerSubtitle")}</p>
      </div>

      <ProductionEngineerSummary
        scanId={scanId}
        verdict={verdict}
        scanCompleted
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/projects/${projectId}/scans/${scanId}/report`}>
            {t("viewTechnicalDetails")}
          </Link>
        </Button>
        <Button className="flex-1" onClick={onContinue}>
          {tc("continue")}
        </Button>
      </div>
    </div>
  );
}
