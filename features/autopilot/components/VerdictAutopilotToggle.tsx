"use client";

import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";

export function VerdictAutopilotToggle({ enabled }: { enabled: boolean }) {
  const { t } = useI18n("autopilotExperience");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        aria-pressed={enabled}
        onClick={() => {
          if (enabled) return;
          startTransition(async () => {
            const { setVerdictAutopilotEnabledAction } = await import(
              "@/server/actions/autopilot"
            );
            await setVerdictAutopilotEnabledAction(true);
          });
        }}
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          enabled
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        }`}
      >
        {t("settings.on")}
      </button>
      <button
        type="button"
        disabled={pending}
        aria-pressed={!enabled}
        onClick={() => {
          if (!enabled) return;
          startTransition(async () => {
            const { setVerdictAutopilotEnabledAction } = await import(
              "@/server/actions/autopilot"
            );
            await setVerdictAutopilotEnabledAction(false);
          });
        }}
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          !enabled
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        }`}
      >
        {t("settings.off")}
      </button>
    </div>
  );
}
