"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganizationAction } from "@/server/actions/organizations";
import { useI18n } from "@/lib/i18n/client";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
});

type FormValues = z.infer<typeof schema>;

export function OrgSetupForm() {
  const { t } = useI18n("workspace");
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", values.name);
      const result = await createOrganizationAction(fd);
      if (result?.error) {
        const err = result.error as Record<string, string[]> | string;
        const msg =
          typeof err === "string"
            ? err
            : err._root?.[0] ?? err.name?.[0] ?? t("createFailed");
        setError("name", { message: msg });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("createNameLabel")}</Label>
        <Input
          id="name"
          placeholder={t("createNamePlaceholder")}
          disabled={isPending}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Building2 className="mr-2 h-4 w-4" />
        )}
        {t("createSubmit")}
      </Button>
    </form>
  );
}
