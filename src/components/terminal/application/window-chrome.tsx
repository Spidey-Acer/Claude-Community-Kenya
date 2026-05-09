interface WindowButtonsProps {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

export function WindowButtons({
  onClose,
  onMinimize,
  onMaximize,
}: WindowButtonsProps) {
  return (
    <div className="flex items-center gap-[7px]">
      <button
        onClick={onClose}
        className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f57] transition-opacity hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        aria-label="Close terminal"
      >
        <svg
          className="h-[6px] w-[6px] opacity-0 group-hover:opacity-100"
          viewBox="0 0 12 12"
          fill="none"
          stroke="rgba(0,0,0,0.6)"
          strokeWidth="2.5"
        >
          <path d="M1 1l10 10M11 1L1 11" />
        </svg>
      </button>
      <button
        onClick={onMinimize}
        className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-[#febc2e] transition-opacity hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        aria-label="Minimize terminal"
      >
        <svg
          className="h-[6px] w-[6px] opacity-0 group-hover:opacity-100"
          viewBox="0 0 12 12"
          fill="none"
          stroke="rgba(0,0,0,0.6)"
          strokeWidth="2.5"
        >
          <path d="M1 6h10" />
        </svg>
      </button>
      <button
        onClick={onMaximize}
        className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-[#28c840] transition-opacity hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        aria-label="Maximize terminal"
      >
        <svg
          className="h-[6px] w-[6px] opacity-0 group-hover:opacity-100"
          viewBox="0 0 12 12"
          fill="none"
          stroke="rgba(0,0,0,0.6)"
          strokeWidth="2.5"
        >
          <path d="M1.5 3.5v7h7M3.5 1.5h7v7" />
        </svg>
      </button>
    </div>
  );
}
