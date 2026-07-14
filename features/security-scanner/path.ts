export function sanitizePath(input: string): string | null {
  if (!input || input.includes("\0") || input.startsWith("/") || /^[A-Za-z]:[\\/]/.test(input)) {
    return null;
  }

  const normalized = input.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
  const parts: string[] = [];
  for (const part of normalized.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/") || null;
}

export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (name.startsWith(".env")) return ".env";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}
