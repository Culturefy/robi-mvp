export default function LoadingAllDocuments() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-block h-5 w-5 border-2 border-[#08213E]/60 border-t-transparent rounded-full animate-spin" />
        <span className="text-[#08213E] font-medium">Loading all files…</span>
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg bg-white shadow-sm">
            <div className="p-4 border-b bg-gray-50">
              <div className="h-4 w-40 bg-gray-200 rounded mb-1" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-4 w-2/3 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

