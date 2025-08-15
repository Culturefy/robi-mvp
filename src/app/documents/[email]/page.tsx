import { listBlobsByPrefix, getPublicBlobUrl } from "@/lib/azureList";
import { safePathSegment } from "@/lib/sanitize";

export default async function DocumentsByEmailPage({ params }: any) {
  // Some Next.js versions type params as a Promise; normalize it here.
  const resolvedParams = params && typeof (params as any)?.then === "function" ? await params : params;
  const emailSeg = safePathSegment(resolvedParams?.email);
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const startYear = 2020; // Adjust if your data starts later

  let items: { name: string; url: string; size?: number; lastModified?: string }[] = [];
  let error: string | undefined;
  try {
    // Gather documents across years for this email
    const all: typeof items = [];
    for (let y = startYear; y <= currentYear; y++) {
      const prefix = `leads/${y}/${emailSeg}/`;
      const list = await listBlobsByPrefix(prefix);
      all.push(...list);
    }
    // Newest first by lastModified or by name (timestamp prefix)
    items = all.sort((a, b) => {
      const at = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const bt = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return bt - at;
    });
  } catch (e: any) {
    error = e?.message || "Failed to load documents";
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#08213E" }}>Documents for {emailSeg}</h1>
          <p className="text-gray-600">Showing files under leads/&lt;year&gt;/{emailSeg}/</p>
        </div>
        <a href="/documents" className="text-sm text-[#08213E] underline self-center">Search another email</a>
      </div>
      {error ? (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-600">No documents found.</div>
      ) : (
        <div>
          <div className="text-sm text-gray-500 mb-2">{items.length} file{items.length === 1 ? "" : "s"}</div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((it) => {
              const display = it.name.split("/").pop() || it.name;
              const href = getPublicBlobUrl(it.name);
              const size = it.size ? formatBytes(it.size) : undefined;
              const lm = it.lastModified ? new Date(it.lastModified).toLocaleString() : undefined;
              const ext = display.includes(".") ? display.split(".").pop()?.toLowerCase() : undefined;
              const emoji = ext === "pdf" ? "📄" : ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" ? "🖼️" : "📎";
              return (
                <li key={it.name} className="p-4 border rounded-lg shadow-sm bg-white hover:shadow transition-shadow">
                  <div className="flex items-start justify-between gap-4">
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
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
