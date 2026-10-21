import { itemLook } from "@/lib/item-style";

// Drawn item pictures, so every card has some colour without needing uploaded images.
export function ItemArt({ item, className = "", size = "md" }: { item: { slug: string; category: string; name: string }; className?: string; size?: "sm" | "md" | "lg" }) {
  const look = itemLook(item);
  const pad = size === "sm" ? "p-1.5" : size === "lg" ? "p-10" : "p-6";
  return (
    <div className={`relative flex items-center justify-center ${pad} ${className}`} style={{ background: look.bg }} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="w-full h-full max-h-56 drop-shadow-[0_6px_10px_rgba(60,30,10,0.18)]">
        {look.kind === "wood" && <Log color={look.main} />}
        {look.kind === "axe" && <Axe color={look.main} />}
        {look.kind === "other" && <Crate color={look.main} />}
      </svg>
    </div>
  );
}

function Log({ color }: { color: string }) {
  return (
    <g>
      <rect x="14" y="34" width="62" height="34" rx="4" fill={color} />
      <rect x="14" y="34" width="62" height="34" rx="4" fill="url(#bark)" opacity="0.35" />
      <path d="M22 44h30M30 52h38M20 60h26" stroke="#000" strokeOpacity="0.14" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="76" cy="51" rx="13" ry="17" fill="#5a3418" />
      <ellipse cx="76" cy="51" rx="10.5" ry="14.5" fill={color} />
      <ellipse cx="76" cy="51" rx="10.5" ry="14.5" fill="#fff" opacity="0.28" />
      <ellipse cx="76" cy="51" rx="6.5" ry="9" fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="1.6" />
      <ellipse cx="76" cy="51" rx="2.6" ry="3.6" fill="#000" fillOpacity="0.25" />
      <defs>
        <linearGradient id="bark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
      </defs>
    </g>
  );
}

function Axe({ color }: { color: string }) {
  return (
    <g transform="rotate(-28 50 50)">
      <rect x="46" y="22" width="8" height="66" rx="4" fill="#8a5a2b" />
      <rect x="46" y="22" width="3" height="66" rx="1.5" fill="#fff" opacity="0.25" />
      <path d="M50 18 C68 12 80 20 82 38 C72 36 62 38 54 42 L50 42 Z" fill={color} />
      <path d="M50 18 C40 14 30 18 28 30 C36 30 44 32 50 36 Z" fill={color} opacity="0.75" />
      <path d="M56 22 C66 20 74 25 77 33" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Crate({ color }: { color: string }) {
  return (
    <g>
      <rect x="22" y="26" width="56" height="50" rx="8" fill={color} />
      <path d="M22 44h56M50 26v50" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" />
    </g>
  );
}
