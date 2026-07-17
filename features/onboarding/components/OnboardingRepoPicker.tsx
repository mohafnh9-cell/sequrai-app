"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { GitBranch, Lock, RefreshCw, Search, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startGitHubOAuth } from "@/lib/github/oauth-client";
import type { GitHubRepo } from "@/lib/github";

type Step = "idle" | "loading" | "selecting" | "saving" | "error";

export function OnboardingRepoPicker({
  onRepositoryConnected,
}: {
  onRepositoryConnected: (projectId: string) => void;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchRepos = useCallback(async () => {
    setStep("loading");
    setErrorMsg("");

    const res = await fetch("/api/github/repos");
    const data = await res.json();

    if (data.needsReauth || res.status === 403) {
      localStorage.setItem("sequrai_github_connect", "1");
      await startGitHubOAuth("/onboarding?step=github");
      return;
    }

    if (!res.ok) {
      setErrorMsg(data.error || "Failed to load repositories");
      setStep("error");
      return;
    }

    setRepos(data.repos);
    setStep("selecting");
  }, []);

  useEffect(() => {
    queueMicrotask(() => void fetchRepos());
  }, [fetchRepos]);

  const saveRepo = async () => {
    const repo = repos.find((r) => r.id === selectedId);
    if (!repo) return;

    setStep("saving");
    setErrorMsg("");

    try {
      const res = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos: [repo] }),
      });
      const data = (await res.json().catch(() => null)) as
        | { projectIds?: string[]; saved?: number; error?: string; needsReauth?: boolean }
        | null;

      if (data?.needsReauth || res.status === 403) {
        localStorage.setItem("sequrai_github_connect", "1");
        await startGitHubOAuth("/onboarding?step=github");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Could not connect repository");
      }

      const projectId = data?.projectIds?.[0];
      if (!projectId) {
        throw new Error("Repository connected but project could not be resolved.");
      }
      onRepositoryConnected(projectId);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to save repository");
      setStep("error");
    }
  };

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  if (step === "loading" || step === "idle") {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <h2 className="text-xl font-semibold">Choose your first project</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
          Loading your repositories…
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Choose your first project</h2>
        {repos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center space-y-3">
            <p className="text-sm font-medium">No repositories found.</p>
            <p className="text-sm text-muted-foreground">
              Create or connect a GitHub repository to receive your first Production Verdict.
            </p>
          </div>
        ) : (
          <p className="text-sm text-destructive">{errorMsg}</p>
        )}
        <Button variant="outline" onClick={() => void fetchRepos()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <h2 className="text-xl font-semibold">Choose your first project</h2>
        <div className="rounded-xl border border-dashed border-border/70 p-6 text-center space-y-3">
          <p className="text-sm font-medium">No repositories found.</p>
          <p className="text-sm text-muted-foreground">
            Create or connect a GitHub repository to receive your first Production Verdict.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchRepos()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh repositories
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-xl font-semibold">Choose your first project</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select one repository for your first Production Verdict.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repositories…"
          className="pl-9"
          aria-label="Search repositories"
        />
      </div>

      <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1" role="listbox" aria-label="Repositories">
        {filtered.map((repo) => {
          const selected = selectedId === repo.id;
          return (
            <li key={repo.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => setSelectedId(repo.id)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border/60 bg-secondary/20 hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{repo.full_name}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Updated{" "}
                        {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" aria-hidden />
                        {repo.default_branch}
                      </span>
                      <span className="flex items-center gap-1">
                        {repo.private ? (
                          <Lock className="h-3 w-3" aria-hidden />
                        ) : (
                          <Unlock className="h-3 w-3" aria-hidden />
                        )}
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        className="w-full"
        size="lg"
        disabled={selectedId == null || step === "saving"}
        onClick={() => void saveRepo()}
      >
        {step === "saving" ? "Connecting repository…" : "Analyze Repository"}
      </Button>
    </div>
  );
}
