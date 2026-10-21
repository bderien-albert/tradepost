import type { WoodSize } from "@prisma/client";

export const WOOD_SIZES: { key: WoodSize; label: string; short: string }[] = [
  { key: "SMALL", label: "Small", short: "S" },
  { key: "MEDIUM", label: "Medium", short: "M" },
  { key: "BIG", label: "Big", short: "L" },
  { key: "SMALL_TRUCKLOAD", label: "Small Truckload", short: "ST" },
  { key: "LONG_TRUCKLOAD", label: "Long Truckload", short: "LT" },
];

export function sizeLabel(size: WoodSize | null | undefined) {
  return WOOD_SIZES.find((s) => s.key === size)?.label ?? null;
}

export function isWood(category: string) {
  return category.toLowerCase() === "wood";
}
