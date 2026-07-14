"use client";

import { useState } from "react";
import { Cpu, Code2, Terminal, Copy, Check, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn, severityColor } from "@/lib/utils";

type Vulnerability = {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  impact?: string | null;
  recommendation?: string | null;
  filePath?: string | null;
  lineNumber?: number | null;
  status: string;
  aiFixPrompt?: string | null;
  cursorPrompt?: string | null;
  claudePrompt?: string | null;
  codeSnippet?: string | null;
};

type AIFix = {
  explanation: string;
  risk: string;
  priority: string;
  steps: string[];
  cursorPrompt: string;
  claudePrompt: string;
  codeSuggestion?: string | null;
};

interface Props {
  vulnerability: Vulnerability;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1.5 text-xs">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {label ?? (copied ? "Copied!" : "Copy")}
    </Button>
  );
}

function PromptBox({ prompt, title, icon: Icon, color }: {
  prompt: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <CopyButton text={prompt} />
      </div>
      <div className="rounded-md border border-border/50 bg-secondary/30 p-3">
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono leading-relaxed max-h-52 overflow-y-auto">
          {prompt}
        </pre>
      </div>
    </div>
  );
}

export function AIFixPanel({ vulnerability }: Props) {
  const [aiFix, setAiFix] = useState<AIFix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generateFix = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vulnerabilityId: vulnerability.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate fix");
      }

      const data = await res.json();
      setAiFix(data);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate fix");
    } finally {
      setLoading(false);
    }
  };

  const cursorPrompt = aiFix?.cursorPrompt ?? vulnerability.cursorPrompt;
  const claudePrompt = aiFix?.claudePrompt ?? vulnerability.claudePrompt;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base leading-tight">{vulnerability.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium border",
                severityColor(vulnerability.severity)
              )}>
                {vulnerability.severity}
              </span>
              <Badge variant="outline" className="text-xs">{vulnerability.category}</Badge>
              {vulnerability.filePath && (
                <span className="text-xs text-muted-foreground font-mono">
                  {vulnerability.filePath}
                  {vulnerability.lineNumber && `:${vulnerability.lineNumber}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <Tabs defaultValue="details">
          <TabsList className="h-8">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="fix" className="text-xs">
              AI Fix
              {(cursorPrompt || claudePrompt) && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-3 space-y-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Description</h4>
              <p className="text-sm leading-relaxed">{vulnerability.description}</p>
            </div>

            {vulnerability.impact && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Impact</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{vulnerability.impact}</p>
              </div>
            )}

            {vulnerability.recommendation && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Recommendation</h4>
                <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono bg-secondary/30 border border-border/50 rounded-md p-3">
                  {vulnerability.recommendation}
                </pre>
              </div>
            )}

            {vulnerability.codeSnippet && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Code snippet</h4>
                <pre className="text-xs font-mono bg-secondary/30 border border-border/50 rounded-md p-3 overflow-x-auto">
                  {vulnerability.codeSnippet}
                </pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fix" className="mt-3 space-y-4">
            {!generated && !cursorPrompt && !claudePrompt && (
              <div className="rounded-lg border border-dashed border-border py-8 text-center">
                <Cpu className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium mb-1">Generate AI Fix</p>
                <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                  Get an explanation, risk assessment, and ready-to-paste prompts for Cursor and Claude Code.
                </p>
                <Button size="sm" onClick={generateFix} disabled={loading}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Cpu className="mr-2 h-4 w-4" /> Generate AI Fix</>
                  )}
                </Button>
                {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              </div>
            )}

            {aiFix && (
              <div className="space-y-4">
                <div className="rounded-md bg-secondary/30 border border-border/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Priority</span>
                    <Badge variant="outline" className="text-xs capitalize">{aiFix.priority}</Badge>
                  </div>
                  <p className="text-sm">{aiFix.explanation}</p>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Risk</p>
                    <p className="text-xs text-muted-foreground">{aiFix.risk}</p>
                  </div>
                  {aiFix.steps.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Steps</p>
                      <ol className="space-y-0.5">
                        {aiFix.steps.map((step, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            {i + 1}. {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {aiFix.codeSuggestion && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Code fix</span>
                      <CopyButton text={aiFix.codeSuggestion} />
                    </div>
                    <pre className="text-xs font-mono bg-secondary/30 border border-border/50 rounded-md p-3 overflow-x-auto">
                      {aiFix.codeSuggestion}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {(cursorPrompt || claudePrompt) && (
              <div className="space-y-4 border-t border-border/50 pt-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fix Prompts</h4>

                {cursorPrompt && (
                  <PromptBox
                    prompt={cursorPrompt}
                    title="Cursor Prompt"
                    icon={Code2}
                    color="text-blue-400"
                  />
                )}
                {claudePrompt && (
                  <PromptBox
                    prompt={claudePrompt}
                    title="Claude Code Prompt"
                    icon={Terminal}
                    color="text-orange-400"
                  />
                )}
              </div>
            )}

            {!generated && (cursorPrompt || claudePrompt) && (
              <Button size="sm" variant="ghost" onClick={generateFix} disabled={loading} className="w-full">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Regenerating...</>
                ) : (
                  <><Cpu className="mr-2 h-4 w-4" /> Regenerate AI Analysis</>
                )}
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
