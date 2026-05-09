export default function GlobalLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="font-mono text-sm text-green-primary">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-primary animate-pulse" />
          loading
          <span className="cursor-blink">▊</span>
        </span>
      </div>
    </div>
  );
}
