"use client";

import { useEffect, useState, useCallback } from "react";
import { GitBranch, Webhook, Zap, RefreshCw, Check, Lock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { startGitHubOAuth } from "@/lib/github/oauth-client";
import type { GitHubRepo } from "@/lib/github";

type Step = "idle" | "loading" | "selecting" | "saving" | "done" | "error";

export default function IntegrationsPage() {
  const [step, setStep] = useState<Step>("idle");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const fetchRepos = useCallback(async () => {
    setStep("loading");
    setErrorMsg("");

    const res = await fetch("/api/github/repos");
    const data = await res.json();

    if (data.needsReauth || res.status === 403) {
      localStorage.setItem("sequrai_github_connect", "1");
      try {
        await startGitHubOAuth("/integrations");
      } catch (oauthError) {
        setErrorMsg(
          oauthError instanceof Error
            ? oauthError.message
            : "Could not start GitHub authorization."
        );
        setStep("error");
      }
      return;
    }

    if (!res.ok) {
      setErrorMsg(data.error || "Failed to load repos");
      setStep("error");
      return;
    }

    setRepos(data.repos);
    setStep("selecting");
  }, []);

  useEffect(() => {
    const pending = localStorage.getItem("sequrai_github_connect");
    if (pending) {
      localStorage.removeItem("sequrai_github_connect");
      queueMicrotask(() => void fetchRepos());
    }
  }, [fetchRepos]);

  const toggleRepo = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((r) => r.id)));
  const clearAll = () => setSelected(new Set());

  const saveRepos = async () => {
    const toSave = repos.filter((r) => selected.has(r.id));
    if (!toSave.length) return;

    setStep("saving");
    setErrorMsg("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos: toSave }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => null)) as
        | { saved?: number; error?: string; needsReauth?: boolean }
        | null;
      if (data?.needsReauth || res.status === 403) {
        localStorage.setItem("sequrai_github_connect", "1");
        try {
          await startGitHubOAuth("/integrations");
        } catch (oauthError) {
          throw new Error(
            oauthError instanceof Error
              ? oauthError.message
              : "Could not start GitHub authorization."
          );
        }
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || `Could not save repositories (${res.status}).`);
      }

      setSavedCount(data?.saved ?? toSave.length);
      setStep("done");
    } catch (error) {
      setErrorMsg(
        error instanceof DOMException && error.name === "AbortError"
          ? "Saving took too long. Please try again."
          : error instanceof Error
            ? error.message
            : "Failed to save repositories."
      );
      setStep("error");
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connect SequrAI with your tools and repositories.
        </p>
      </div>

      {/* GitHub Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <GitBranch className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">GitHub</CardTitle>
                <CardDescription className="text-xs">
                  Connect repos for automated security scanning
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
              Available
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === "idle" && (
            <Button onClick={fetchRepos} className="gap-2">
              <GitBranch className="h-4 w-4" />
              Connect GitHub Repositories
            </Button>
          )}

          {step === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading your repositories...
            </div>
          )}

          {step === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button variant="outline" onClick={fetchRepos} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="flex items-center gap-3 text-sm text-emerald-400">
              <Check className="h-4 w-4" />
              <span>{savedCount} repositories connected successfully.</span>
              <Button variant="ghost" size="sm" onClick={() => { setStep("selecting"); setSavedCount(0); }}>
                Edit selection
              </Button>
            </div>
          )}

          {(step === "selecting" || step === "saving") && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search repositories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm h-8 text-sm"
                />
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
                  Clear
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {selected.size} selected
                </span>
              </div>

              <div className="grid gap-2 max-h-96 overflow-y-auto pr-1">
                {filtered.map((repo) => {
                  const isSelected = selected.has(repo.id);
                  return (
                    <button
                      key={repo.id}
                      onClick={() => toggleRepo(repo.id)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors w-full ${
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{repo.full_name}</span>
                          {repo.private && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{repo.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {repo.language && (
                          <span className="text-xs text-muted-foreground">{repo.language}</span>
                        )}
                        {repo.stargazers_count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3" />
                            {repo.stargazers_count}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No repositories found</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  onClick={saveRepos}
                  disabled={selected.size === 0 || step === "saving"}
                  className="gap-2"
                >
                  {step === "saving" ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    <><Check className="h-4 w-4" />Protect {selected.size} repo{selected.size !== 1 ? "s" : ""}</>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={fetchRepos} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GitHub webhook automation */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">GitHub Security Automation</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Add this webhook in each GitHub repository to enable automatic incremental scans on
            push and Pull Request analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Payload URL</p>
            <code className="block rounded-md bg-secondary/50 px-3 py-2 text-xs break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/webhooks/github`
                : "https://sequrai-app.vercel.app/api/webhooks/github"}
            </code>
          </div>
          <p className="text-xs text-muted-foreground">
            Events: <span className="text-foreground">push, pull_request, delete, repository</span>.
            Set the same secret as <code className="text-foreground">GITHUB_WEBHOOK_SECRET</code> in
            Vercel.
          </p>
        </CardContent>
      </Card>

      {/* Channel integrations */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { name: "Slack", description: "Get notified about critical issues in Slack.", icon: Zap },
          { name: "Discord", description: "Security alerts in your Discord server.", icon: Zap },
        ].map((item) => (
          <Card key={item.name} className="border-border/50 opacity-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">Soon</Badge>
              </div>
              <CardTitle className="text-sm mt-3">{item.name}</CardTitle>
              <CardDescription className="text-xs">{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
