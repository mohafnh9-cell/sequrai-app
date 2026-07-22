"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ClipboardCopy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

function buildMcpJson(apiKey: string, apiUrl: string) {
  return JSON.stringify(
    {
      mcpServers: {
        sequrai: {
          command: "node",
          args: ["${workspaceFolder}/mcp/stdio-bridge.mjs"],
          env: {
            SEQURAI_API_KEY: apiKey,
            SEQURAI_API_URL: apiUrl,
          },
        },
      },
    },
    null,
    2
  );
}

export function OnboardingMcpStep({ onContinue }: { onContinue: () => void }) {
  const { t } = useI18n("onboarding");
  const { t: ts } = useI18n("settings");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const apiUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.NEXT_PUBLIC_APP_URL ?? "https://sequrai-app.vercel.app";
  }, []);

  const mcpJson = useMemo(
    () => (apiKey ? buildMcpJson(apiKey, apiUrl) : null),
    [apiKey, apiUrl]
  );

  const createKey = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mcp/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Cursor MCP" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? ts("mcpCreateKeyFailed"));
        return;
      }
      setApiKey(data.key.rawKey as string);
    } finally {
      setLoading(false);
    }
  }, [ts]);

  useEffect(() => {
    queueMicrotask(() => void createKey());
  }, [createKey]);

  async function copyConfig() {
    if (!mcpJson) return;
    await navigator.clipboard.writeText(mcpJson);
    setCopiedConfig(true);
    window.setTimeout(() => setCopiedConfig(false), 2000);
  }

  async function copyKeyOnly() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    window.setTimeout(() => setCopiedKey(false), 2000);
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">{t("mcpEyebrow")}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{t("mcpTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("mcpSubtitle")}</p>
      </div>

      <div className="rounded-3xl border border-border/70 bg-gradient-to-b from-secondary/30 to-[#101014]/60 p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Terminal className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-medium">{t("mcpStepOneTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("mcpStepOneBody")}</p>
          </div>
        </div>

        {loading && !apiKey && (
          <p className="text-sm text-muted-foreground animate-pulse">{t("mcpGeneratingKey")}</p>
        )}

        {error && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void createKey()} disabled={loading}>
              {t("mcpRetryKey")}
            </Button>
          </div>
        )}

        {apiKey && (
          <>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <p className="text-sm font-medium">{ts("mcpCopyKeyTitle")}</p>
              <code className="block text-xs break-all bg-muted/80 p-3 rounded-lg font-mono">{apiKey}</code>
              <Button size="sm" variant="outline" onClick={() => void copyKeyOnly()}>
                {copiedKey ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    {ts("mcpCopied")}
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    {ts("mcpCopyKey")}
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">{t("mcpStepTwoTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("mcpStepTwoBody")}</p>
              <pre className="overflow-x-auto rounded-xl border border-border/60 bg-[#0a0a0c] p-4 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {mcpJson}
              </pre>
              <Button className="w-full" size="lg" onClick={() => void copyConfig()}>
                {copiedConfig ? (
                  <>
                    <Check className="mr-2 h-4 w-4" aria-hidden />
                    {t("mcpConfigCopied")}
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden />
                    {t("mcpCopyConfig")}
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4 space-y-2">
              <p className="text-sm font-medium">{t("mcpStepThreeTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("mcpStepThreeBody")}</p>
              <p className="text-sm font-medium text-foreground">&ldquo;{t("mcpExamplePrompt")}&rdquo;</p>
            </div>
          </>
        )}
      </div>

      <Button className="w-full" size="lg" onClick={onContinue} disabled={!apiKey}>
        {t("mcpContinue")}
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
