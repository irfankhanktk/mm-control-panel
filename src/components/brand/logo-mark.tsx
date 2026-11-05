/** Placeholder MyMasjid mark (dome and crescent). Swap the SVG for the official logo when it is available. */
export function LogoMark({ className = "size-10" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid place-items-center rounded-xl bg-sun text-white ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-3/5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20v-6a8 8 0 0 1 16 0v6" />
        <path d="M2 20h20" />
        <path d="M12 6V3" />
        <path d="M10.5 4.5a2 2 0 1 0 3 0" />
      </svg>
    </span>
  );
}
