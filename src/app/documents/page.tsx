"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { safePathSegment } from "@/lib/sanitize";

export default function DocumentsPortalPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const seg = safePathSegment(email);
    if (!seg) return;
    startTransition(() => {
      router.push(`/documents/${encodeURIComponent(seg)}`);
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2" style={{ color: "#08213E" }}>Document Portal</h1>
      <p className="text-gray-600 mb-6">Enter an email to view uploaded documents.</p>
      <form onSubmit={onSubmit} className="flex gap-2 items-center">
        <input
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E2AD44] disabled:bg-gray-100"
          required
          disabled={pending}
        />
        <button type="submit" className="px-4 h-10 rounded-lg text-white font-medium flex items-center gap-2 disabled:opacity-70" style={{ backgroundColor: "#08213E" }} disabled={pending}>
          {pending && (
            <span className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
          )}
          {pending ? "Searching..." : "View Documents"}
        </button>
        <a href="/documents/all" className="h-10 px-4 rounded-lg border text-sm flex items-center hover:bg-gray-50" style={{ color: "#08213E", borderColor: "#08213E" }}>
          Browse All by Email
        </a>
      </form>
      <div className="mt-6 text-xs text-gray-500">
        Tip: use the same email that was used to upload documents.
      </div>
    </div>
  );
}
