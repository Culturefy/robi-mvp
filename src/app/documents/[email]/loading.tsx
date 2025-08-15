export default function LoadingDocumentsByEmail() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-block h-5 w-5 border-2 border-[#08213E]/60 border-t-transparent rounded-full animate-spin" />
        <span className="text-[#08213E] font-medium">Searching files…</span>
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg shadow-sm bg-white">
            <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-72 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

