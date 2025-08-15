import { listBlobsByPrefix } from "@/lib/azureList";
import { safePathSegment } from "@/lib/sanitize";
import AllDocumentsBrowser from "@/components/AllDocumentsBrowser";

type Group = {
  email: string;
  files: { name: string; url: string; size?: number; lastModified?: string }[];
};

export default async function AllDocumentsByEmailPage() {
  let groups: Group[] = [];
  let error: string | undefined;
  try {
    const items = await listBlobsByPrefix("leads/");
    const map = new Map<string, Group>();
    for (const it of items) {
      const parts = it.name.split("/");
      // Expect pattern: leads/<year>/<email>/<filename>
      if (parts.length >= 4 && parts[0] === "leads" && /^\d{4}$/.test(parts[1])) {
        const emailSeg = safePathSegment(parts[2]);
        const grp = map.get(emailSeg) || { email: emailSeg, files: [] };
        grp.files.push(it);
        map.set(emailSeg, grp);
      }
    }
    groups = Array.from(map.values())
      .map((g) => ({
        ...g,
        files: g.files.sort((a, b) => {
          const at = a.lastModified ? new Date(a.lastModified).getTime() : 0;
          const bt = b.lastModified ? new Date(b.lastModified).getTime() : 0;
          return bt - at;
        }),
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  } catch (e: any) {
    error = e?.message || "Failed to load documents";
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#08213E" }}>All Documents by Email</h1>
          <p className="text-gray-600">Browsing all files grouped by email under leads/&lt;year&gt;/&lt;email&gt;/</p>
        </div>
        <a href="/documents" className="text-sm text-[#08213E] underline self-center">Back to search</a>
      </div>
      {error ? (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      ) : groups.length === 0 ? (
        <div className="text-sm text-gray-600">No documents found.</div>
      ) : (
        <AllDocumentsBrowser groups={groups} />
      )}
    </div>
  );
}
