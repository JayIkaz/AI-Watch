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
    "model-release": "text-sky bg-sky/10 border-sky/20",
    "api-changelog": "text-amber bg-amber/10 border-amber/20",
    "pricing": "text-teal bg-teal/10 border-teal/20",
    "safety": "text-violet bg-violet/10 border-violet/20",
    "research": "text-violet bg-violet/10 border-violet/20",
    "product": "text-raspberry bg-raspberry/10 border-raspberry/20",
  };
  return colors[slug] || "text-sky bg-sky/10 border-sky/20";
}
