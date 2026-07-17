"use client";

import { Globe } from "lucide-react";
import { APP_LOCALES, type AppLocale } from "@/lib/i18n/types";
import { LOCALE_LABELS } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSelector({
  variant = "default",
  className,
}: {
  variant?: "default" | "compact" | "settings";
  className?: string;
}) {
  const { locale, setLocale, isChangingLocale, t } = useI18n("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "settings" ? "outline" : "ghost"}
          size={variant === "compact" ? "sm" : "default"}
          className={cn("gap-2", className)}
          aria-label={t("language")}
          disabled={isChangingLocale}
        >
          <Globe className="h-4 w-4" aria-hidden />
          <span>{LOCALE_LABELS[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="text-xs">{t("language")}</DropdownMenuLabel>
        {APP_LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => void setLocale(code as AppLocale)}
            className={locale === code ? "font-medium" : undefined}
            aria-current={locale === code ? "true" : undefined}
          >
            {LOCALE_LABELS[code as AppLocale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
