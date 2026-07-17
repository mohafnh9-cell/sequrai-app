"use client";

import { useI18n } from "@/lib/i18n/client";

export function VendorLockInNotice({ className = "" }: { className?: string }) {
  const { t } = useI18n("onboarding");

  return (
    <aside
      className={`rounded-xl border border-border/50 bg-secondary/30 p-4 text-sm text-muted-foreground ${className}`}
      aria-label={t("vendorTitle")}
    >
      <p className="font-medium text-foreground text-xs uppercase tracking-wide mb-2">
        {t("vendorTitle")}
      </p>
      <p className="mb-2">{t("vendorNever")}</p>
      <ul className="space-y-1 list-disc pl-5">
        <li>{t("vendorDeploy")}</li>
        <li>{t("vendorModify")}</li>
        <li>{t("vendorMerge")}</li>
        <li>{t("vendorChanges")}</li>
      </ul>
    </aside>
  );
}
