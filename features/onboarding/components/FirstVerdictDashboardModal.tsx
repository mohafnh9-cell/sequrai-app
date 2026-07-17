"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function FirstVerdictDashboardModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const { t } = useI18n("dashboard");
  const { t: to } = useI18n("onboarding");
  const open = searchParams.get("firstVerdict") === "1" && !dismissed;

  const dismiss = () => {
    setDismissed(true);
    router.replace("/dashboard");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <DialogTitle>{t("firstVerdictModalTitle")}</DialogTitle>
          <DialogDescription>{t("firstVerdictModalBody")}</DialogDescription>
        </DialogHeader>
        <Button className="w-full" onClick={dismiss}>
          {to("goToDashboard")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
