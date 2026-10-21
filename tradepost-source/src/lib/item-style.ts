// Colours used to draw each item's card art. Unknown items get a stable colour from their name.
const WOOD: Record<string, [string, string]> = {
  oak: ["#d9a066", "#f6dfc0"],
  birch: ["#f1e6cf", "#fffaf0"],
  cherry: ["#b5543c", "#f8d6cb"],
  walnut: ["#6e4428", "#ead7c7"],
  koa: ["#a8642c", "#f6dcc2"],
  pine: ["#e3c27e", "#fbf0d6"],
  fir: ["#c99a5b", "#f7e6cd"],
  palm: ["#c8a46a", "#f6ecd6"],
  "snow-glow": ["#f2f7ff", "#dcecff"],
  frost: ["#9fd3ff", "#e1f2ff"],
  lava: ["#ff6a2b", "#ffe0d1"],
  "gold-swampy": ["#ffcc33", "#fff2c2"],
  zombie: ["#7bb661", "#e3f3d9"],
  spook: ["#ff8a1f", "#ffe6cc"],
  sinister: ["#4a3b6b", "#e4dcf5"],
  phantom: ["#b48cff", "#efe5ff"],
  cavecrawler: ["#2fc3c7", "#d8f6f6"],
};
const AXES: Record<string, string> = {
  "silver-axe": "#c4ccd6",
  "fire-axe": "#ff5a36",
  beesaxe: "#ffc61a",
  rukiryaxe: "#2fbf71",
  "end-times-axe": "#5b2bd9",
  "candy-cane-axe": "#ff3b6b",
  "bluesteel-axe": "#2f7bff",
};

function hashColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return [`hsl(${h} 70% 55%)`, `hsl(${h} 80% 92%)`] as const;
}

export type ItemLook = { kind: "wood" | "axe" | "other"; main: string; bg: string };

export function itemLook(item: { slug: string; category: string }): ItemLook {
  const cat = item.category.toLowerCase();
  if (cat === "wood") {
    const [main, bg] = WOOD[item.slug] ?? hashColor(item.slug);
    return { kind: "wood", main, bg };
  }
  if (cat.startsWith("axe")) {
    const main = AXES[item.slug] ?? hashColor(item.slug)[0];
    return { kind: "axe", main, bg: hashColor(item.slug)[1] };
  }
  const [main, bg] = hashColor(item.slug);
  return { kind: "other", main, bg };
}
