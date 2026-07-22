"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganizationAction } from "@/server/actions/organizations";
import { useI18n } from "@/lib/i18n/client";

type FormValues = { name: string };

export function OrgSetupForm({ nextStep = "github" }: { nextStep?: string }) {
  const router = useRouter();
  const { t } = useI18n("workspace");
  const { t: to } = useI18n("onboarding");
  const [isPending, startTransition] = useTransition();
  const [submitLocked, setSubmitLocked] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(2, to("workspaceNameMin"))
          .max(80, to("workspaceNameMax")),
      }),
    [to]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    if (submitLocked || isPending) return;
    setSubmitLocked(true);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", values.name.trim());
        fd.set("nextStep", nextStep);
        const result = await createOrganizationAction(fd);

        if (!result.ok) {
          setSubmitLocked(false);
          const err = result.error;
          const msg = err._root?.[0] ?? err.name?.[0] ?? t("createFailed");
          setError("name", { message: msg });
          return;
        }

        router.refresh();
        router.push(result.redirectTo);
      } catch {
        setSubmitLocked(false);
        setError("name", { message: t("createFailed") });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">{to("workspaceNameLabel")}</Label>
        <Input
          id="name"
          placeholder={to("workspaceNamePlaceholder")}
          disabled={isPending}
          autoComplete="organization"
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isPending || submitLocked}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            {to("creatingWorkspace")}
          </>
        ) : (
          <>
            <Building2 className="mr-2 h-4 w-4" aria-hidden />
            {to("workspaceContinue")}
          </>
        )}
      </Button>
    </form>
  );
}
