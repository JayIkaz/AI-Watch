import * as RssParserModule from "rss-parser";

// rss-parser is a CJS `export =` module. Under some bundlers' TS resolution
// (seen on Vercel's build, not reproduced locally) a plain default import
// resolves to the whole module namespace instead of the constructor —
// this works regardless of which shape comes through.
const Parser = (RssParserModule as unknown as { default?: typeof RssParserModule }).default ?? RssParserModule;

export interface FeedItem {
  title: string;
  content: string;
  sourceUrl: string;
  publishedAt: Date | null;
}

const parser = new Parser({
  timeout: 30000,
  headers: { "User-Agent": "AIWatch/1.0 RSS Reader" },
});

export async function fetchFeedItems(url: string, opts?: { maxItems?: number }): Promise<FeedItem[]> {
  const maxItems = opts?.maxItems ?? 20;
  const feed = await parser.parseURL(url);

  const items: FeedItem[] = [];
  for (const item of feed.items ?? []) {
    const title = (item.title ?? "").trim();
    const sourceUrl = (item.link ?? "").trim();
    if (!title || !sourceUrl) continue;

    const content = (item.contentSnippet ?? item.content ?? item.summary ?? "").trim();
    const rawDate = item.isoDate ?? item.pubDate;
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const publishedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    items.push({ title, content, sourceUrl, publishedAt });
    if (items.length >= maxItems) break;
  }

  return items;
}
