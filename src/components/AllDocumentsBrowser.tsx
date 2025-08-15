"use client";
import { useMemo, useState } from "react";

type FileItem = { name: string; url: string; size?: number; lastModified?: string };
type Group = { email: string; files: FileItem[] };

export default function AllDocumentsBrowser({ groups }: { groups: Group[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groups;
    return groups
      .map((g) => {
        const emailHit = g.email.toLowerCase().includes(term);
        const files = emailHit
          ? g.files
          : g.files.filter((f) => (f.name.split("/").pop() || f.name).toLowerCase().includes(term));
        return { ...g, files };
      })
      .filter((g) => g.files.length > 0);
  }, [groups, query]);

  const totalFiles = (gs: Group[]) => gs.reduce((acc, g) => acc + g.files.length, 0);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="search"
          placeholder="Search by email or filename"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44]"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="px-3 h-10 border rounded-lg text-sm"
            style={{ color: "#08213E", borderColor: "#08213E" }}
          >
            Clear
          </button>
        )}
      </div>
      <div className="text-xs text-gray-500 mb-3">
        Showing {filtered.length} email{filtered.length === 1 ? "" : "s"} • {totalFiles(filtered)} file{totalFiles(filtered) === 1 ? "" : "s"}
      </div>
      <div className="space-y-6">
        {filtered.map((g) => (
          <section key={g.email} className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div>
                <div className="font-medium text-[#08213E]">{g.email}</div>
                <div className="text-xs text-gray-500">{g.files.length} file{g.files.length === 1 ? "" : "s"}</div>
              </div>
              <a href={`/documents/${encodeURIComponent(g.email)}`} className="text-sm text-white px-3 py-1.5 rounded" style={{ backgroundColor: "#08213E" }}>
                View Page
              </a>
            </div>
            <ul className="divide-y">
              {g.files.map((it) => {
                const display = it.name.split("/").pop() || it.name;
                const href = it.url;
                const size = it.size ? formatBytes(it.size) : undefined;
                const lm = it.lastModified ? new Date(it.lastModified).toLocaleString() : undefined;
                const ext = display.includes(".") ? display.split(".").pop()?.toLowerCase() : undefined;
                const emoji = ext === "pdf" ? "📄" : ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" ? "🖼️" : "📎";
                return (
                  <li key={it.name} className="py-3 px-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden>{emoji}</span>
                        <div className="font-medium text-[#08213E] break-all">{display}</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="break-all">Path: {it.name}</span>
                        {size && <span>Size: {size}</span>}
                        {lm && <span>Modified: {lm}</span>}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <a href={href} target="_blank" className="text-sm text-white px-3 py-1.5 rounded" style={{ backgroundColor: "#08213E" }}>
                        Open
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do {
    bytes = bytes / 1024;
    i++;
  } while (bytes >= 1024 && i < units.length - 1);
  return `${bytes.toFixed(1)} ${units[i]}`;
}

