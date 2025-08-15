export function safePathSegment(input: string | undefined | null): string {
  const str = String(input || "").toLowerCase();
  const cleaned = str.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
  return cleaned || "unknown";
}

