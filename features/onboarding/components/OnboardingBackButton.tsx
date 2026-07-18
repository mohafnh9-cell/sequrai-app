"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function OnboardingBackButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  const { t } = useI18n("onboarding");

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label ?? t("back")}
    </Button>
  );
}
