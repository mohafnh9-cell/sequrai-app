"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type McpKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
};

export function McpApiKeysPanel() {
  const [keys, setKeys] = useState<McpKeyRow[]>([]);
  const [name, setName] = useState("Cursor MCP");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    const response = await fetch("/api/mcp/keys");
    if (!response.ok) {
      setError("Could not load MCP keys");
      return;
    }
    const data = await response.json();
    setKeys(data.keys ?? []);
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function createKey() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const response = await fetch("/api/mcp/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not create key");
        return;
      }
      setNewKey(data.key.rawKey);
      await loadKeys();
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(id: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/mcp/keys?id=${id}`, { method: "DELETE" });
      if (!response.ok) {
        setError("Could not revoke key");
        return;
      }
      await loadKeys();
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="mcp-key-name">Key name</Label>
        <Input
          id="mcp-key-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Cursor MCP"
        />
      </div>

      <Button size="sm" onClick={createKey} disabled={loading || !name.trim()}>
        Generate MCP API key
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {newKey && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <p className="text-sm font-medium">Copy your API key now</p>
          <p className="text-xs text-muted-foreground">
            This key is shown once. Store it in your Cursor MCP config as SEQURAI_API_KEY.
          </p>
          <code className="block text-xs break-all bg-muted p-2 rounded">{newKey}</code>
          <Button size="sm" variant="outline" onClick={copyKey}>
            {copied ? "Copied" : "Copy key"}
          </Button>
        </div>
      )}

      {keys.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium">Active keys</p>
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border/50 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{key.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{key.key_prefix}…</p>
                {key.last_used_at && (
                  <p className="text-xs text-muted-foreground">
                    Last used {new Date(key.last_used_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary">Active</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={loading}
                  onClick={() => revokeKey(key.id)}
                >
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Cursor setup</p>
        <p>Add to ~/.cursor/mcp.json:</p>
        <pre className="overflow-x-auto whitespace-pre-wrap">{`{
  "sequrai": {
    "command": "node",
    "args": ["/path/to/sequrai-app/mcp/stdio-bridge.mjs"],
    "env": {
      "SEQURAI_API_KEY": "your-key-here",
      "SEQURAI_API_URL": "https://sequrai-app.vercel.app"
    }
  }
}`}</pre>
      </div>
    </div>
  );
}
