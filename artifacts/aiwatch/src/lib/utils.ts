import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function decodeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&hellip;/g, "\u2026");
}

export function getCategoryColor(slug: string) {
  const colors: Record<string, string> = {
    "model-release": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "api-changelog": "text-orange-400 bg-orange-400/10 border-orange-400/20",
    "pricing": "text-green-400 bg-green-400/10 border-green-400/20",
    "safety": "text-purple-400 bg-purple-400/10 border-purple-400/20",
    "research": "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    "product": "text-pink-400 bg-pink-400/10 border-pink-400/20",
  };
  return colors[slug] || "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
}
