export default function WorkspaceLoading() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xl font-bold text-blue-400">
                <span>📝</span> TaskFlow
              </div>
              <div className="animate-pulse bg-slate-700/50 rounded-lg h-6 w-32" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="animate-pulse bg-slate-700/50 rounded-lg h-8 w-24" />
                <div className="animate-pulse bg-slate-700/50 rounded-lg h-8 w-24" />
                <div className="animate-pulse bg-slate-700/50 rounded-lg h-8 w-24" />
              </div>
              <div className="animate-pulse bg-slate-700/50 rounded-lg h-8 w-32" />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-14">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="h-8 w-48 bg-slate-700/50 rounded-lg" />
                <div className="h-4 w-64 bg-slate-700/50 rounded-lg mt-2" />
              </div>
              <div className="h-8 w-32 bg-slate-700/50 rounded-lg" />
            </div>
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
              <div className="h-6 w-32 bg-slate-700/50 rounded-lg mb-4" />
              <div className="h-12 w-full bg-slate-700/50 rounded-xl" />
            </div>
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl">
                    <div className="h-5 w-5 rounded border-2 bg-slate-700/50" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-slate-700/50 rounded-lg" />
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-20 bg-slate-700/50 rounded-full" />
                        <div className="h-5 w-24 bg-slate-700/50 rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-24 bg-slate-700/50 rounded-lg" />
                      <div className="h-8 w-8 bg-slate-700/50 rounded-lg" />
                      <div className="h-8 w-8 bg-slate-700/50 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}