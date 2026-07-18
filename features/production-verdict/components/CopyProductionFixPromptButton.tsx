"use client";

import { useCallback, useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildProductionFixPrompt, type ProductionFixPromptInput } from "@/brain/fix-prompt";
import { trackEvent } from "@/lib/analytics/track";
import { useI18n } from "@/lib/i18n/client";

export function CopyProductionFixPromptButton({
  input,
  source,
  priorityId,
  findingId,
  size = "sm",
  variant = "outline",
  className,
}: {
  input: ProductionFixPromptInput;
  source: "priority" | "finding" | "intelligence";
  priorityId?: string;
  findingId?: string;
  size?: "sm" | "default";
  variant?: "outline" | "secondary" | "default";
  className?: string;
}) {
  const { t } = useI18n("verdict");
  const [copied, setCopied] = useState(false);

  const copyPrompt = useCallback(async () => {
    const { prompt } = buildProductionFixPrompt(input);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/demo")) {
      trackEvent("fix_prompt_copied", {
        source,
        priorityId,
        findingId,
        category: input.category,
        severity: input.severity,
      });
    }
    window.setTimeout(() => setCopied(false), 2000);
  }, [findingId, input, priorityId, source]);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={() => void copyPrompt()}
    >
      {copied ? (
        <>
          <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {t("copiedFixPrompt")}
        </>
      ) : (
        <>
          <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {t("copyFixPrompt")}
        </>
      )}
    </Button>
  );
}
