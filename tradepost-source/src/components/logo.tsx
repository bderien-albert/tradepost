// Tradepost mark: a log end-grain inside two swap arrows.
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#FF5A36"/>
  <path d="M13.81 21.50 A21 21 0 0 1 51.73 24.82" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round"/>
  <path d="M52.96 28.18 L55.62 20.29 L45.85 23.85 Z" fill="#fff"/>
  <path d="M50.19 42.50 A21 21 0 0 1 12.27 39.18" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round"/>
  <path d="M11.04 35.82 L8.38 43.71 L18.15 40.15 Z" fill="#fff"/>
  <circle cx="32" cy="32" r="11.5" fill="#F6C27E"/>
  <circle cx="32" cy="32" r="11.5" fill="none" stroke="#7A3E16" strokeWidth="3.2"/>
  <circle cx="32" cy="32" r="6.6" fill="none" stroke="#B5702F" strokeWidth="1.8"/>
  <circle cx="32" cy="32" r="2.4" fill="#9A5420"/>
    </svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-display font-extrabold tracking-tight text-[1.45rem] leading-none">
        trade<span className="text-brand">post</span>
      </span>
    </span>
  );
}
