export default function ReportLoading() {
  return (
    <div className="min-h-full">
      <div aria-hidden="true" className="land-grid pointer-events-none fixed inset-0" />
      <div className="relative mx-auto w-full px-4 py-6" aria-label="Loading report" aria-busy="true">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 py-16 text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] text-[#22c55e] uppercase">Opening report</p>
          <div aria-hidden="true" className="skeleton w-full max-w-md rounded border border-zinc-800 bg-zinc-950 p-6">
            <div className="mx-auto h-8 w-40 rounded bg-zinc-800" />
            <div className="mx-auto mt-3 h-3 w-56 rounded bg-zinc-800" />
            <div className="mx-auto mt-2 h-3 w-32 rounded bg-zinc-800" />
          </div>
          <p className="animate-pulse font-mono text-xs text-zinc-500">fetching verdict…</p>
        </div>
      </div>
    </div>
  );
}
