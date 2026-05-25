import { Router, type IRouter } from "express";
import { db, newsItemsTable, newsSourcesTable } from "@workspace/db";
import { desc, eq, and, or, ilike, SQL } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import crypto from "crypto";

const router: IRouter = Router();

let isNewsIngestionRunning = false;

const KNOWN_AI_VENDORS = [
  "OpenAI", "Anthropic", "Google", "DeepMind", "Meta", "Mistral", "DeepSeek",
  "Replit", "Perplexity", "xAI", "Grok", "Hugging Face", "Cohere", "Groq",
  "Replicate", "AWS", "Amazon", "Azure", "Microsoft", "Cursor", "GitHub Copilot",
  "Together AI", "Claude", "GPT", "Gemini", "Llama", "Grok",
];

function ruleBasedClassifyNews(title: string, content: string, sourceName: string, sourceType: string): {
  summary: string;
  credibilityRating: "verified" | "likely" | "unverified" | "gossip";
  credibilityReason: string;
  mentionedVendors: string[];
  highInterest: boolean;
} {
  const text = `${title} ${content}`.toLowerCase();

  const credibilityMap: Record<string, "verified" | "likely" | "unverified" | "gossip"> = {
    "official": "verified",
    "techcrunch": "likely",
    "venturebeat": "likely",
    "wired": "verified",
    "reuters": "verified",
    "bloomberg": "verified",
    "mit technology review": "likely",
    "the verge": "likely",
    "ars technica": "likely",
  };

  const sourceKey = sourceName.toLowerCase();
  let credibilityRating: "verified" | "likely" | "unverified" | "gossip" = "unverified";
  for (const [key, rating] of Object.entries(credibilityMap)) {
    if (sourceKey.includes(key)) { credibilityRating = rating; break; }
  }
  if (sourceType === "social") credibilityRating = "gossip";
  if (sourceType === "official") credibilityRating = "verified";

  const mentionedVendors = KNOWN_AI_VENDORS.filter(v => text.includes(v.toLowerCase()));
  const highInterest = /funding|acqui|billion|million|regulat|ban|lawsuit|ceo|resign|fired|controversy/.test(text);
  const summary = content.length > 20
    ? content.substring(0, 350).replace(/\s+/g, " ").trim()
    : title;

  return {
    summary,
    credibilityRating,
    credibilityReason: `Source: ${sourceName} (${sourceType})`,
    mentionedVendors,
    highInterest,
  };
}

async function classifyNewsItem(title: string, content: string, sourceName: string, sourceType: string): Promise<{
  summary: string;
  credibilityRating: "verified" | "likely" | "unverified" | "gossip";
  credibilityReason: string;
  mentionedVendors: string[];
  highInterest: boolean;
}> {
  const prompt = `You are classifying an AI industry news item for a platform tracking AI developments.

Source: ${sourceName} (source type: ${sourceType})
Title: ${title}
Content (truncated): ${content.substring(0, 2000)}

Tasks:
1. Write a 2-3 sentence plain-English summary of this news item.
2. Rate its credibility based on the source and content verifiability:
   - "verified": From major established outlets (Reuters, Bloomberg, NYT, The Verge, TechCrunch, Ars Technica, Wired, Financial Times, BBC) with concrete facts
   - "likely": From reputable tech publications (VentureBeat, MIT Technology Review, ZDNet, 9to5Google, The Information) or well-sourced analysis
   - "unverified": From lesser-known blogs, newsletters, or sources without named insiders — plausible but unconfirmed
   - "gossip": From social media (X/Twitter, Reddit, Hacker News), anonymous sources, or speculative rumors
3. List which AI companies/products are mentioned (from: OpenAI, Anthropic, Google DeepMind, Meta AI, Mistral, DeepSeek, xAI, Grok, Replit, Perplexity, HuggingFace, Cohere, Groq, Replicate, AWS Bedrock, Azure AI, Cursor, GitHub Copilot, Together AI, or their products like ChatGPT, Claude, Gemini, Llama, GPT-4, etc.)
4. Is this high-interest? (true if it involves major funding, acquisitions, leadership changes, regulatory action, or significant controversy)

Respond with JSON only:
{
  "summary": "<2-3 sentence summary>",
  "credibilityRating": "<verified|likely|unverified|gossip>",
  "credibilityReason": "<one sentence explaining why this rating>",
  "mentionedVendors": ["<vendor name>", ...],
  "highInterest": <true|false>
}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    summary: parsed.summary ?? "",
    credibilityRating: parsed.credibilityRating ?? "unverified",
    credibilityReason: parsed.credibilityReason ?? "",
    mentionedVendors: Array.isArray(parsed.mentionedVendors) ? parsed.mentionedVendors : [],
    highInterest: parsed.highInterest ?? false,
  };
}

async function fetchRSSItems(url: string): Promise<Array<{
  title: string;
  content: string;
  sourceUrl: string;
  publishedAt: Date | null;
}>> {
  const response = await fetch(url, {
    headers: { "User-Agent": "AIWatch-News/1.0 RSS Reader" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();
  const items: Array<{ title: string; content: string; sourceUrl: string; publishedAt: Date | null }> = [];

  const itemMatches = text.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
  for (const match of itemMatches) {
    const item = match[1];
    const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description[^>]*>([\s\S]*?)<\/description>/i);
    const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

    const title = decodeHtmlEntities((titleMatch?.[1] ?? titleMatch?.[2] ?? "").trim());
    const link = (linkMatch?.[1] ?? "").trim();
    const desc = decodeHtmlEntities((descMatch?.[1] ?? descMatch?.[2] ?? "").replace(/<[^>]+>/g, " ").trim());
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()) : null;

    if (title && link) items.push({ title, content: desc, sourceUrl: link, publishedAt: pubDate });
  }

  if (items.length === 0) {
    const entryMatches = text.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi);
    for (const match of entryMatches) {
      const entry = match[1];
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/i);
      const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>|<content[^>]*>([\s\S]*?)<\/content>/i);
      const publishedMatch = entry.match(/<published[^>]*>([\s\S]*?)<\/published>|<updated[^>]*>([\s\S]*?)<\/updated>/i);

      const title = decodeHtmlEntities((titleMatch?.[1] ?? "").replace(/<[^>]+>/g, "").trim());
      const link = (linkMatch?.[1] ?? "").trim();
      const summary = decodeHtmlEntities((summaryMatch?.[1] ?? summaryMatch?.[2] ?? "").replace(/<[^>]+>/g, " ").trim());
      const pubDate = publishedMatch ? new Date((publishedMatch[1] ?? publishedMatch[2]).trim()) : null;

      if (title && link) items.push({ title, content: summary, sourceUrl: link, publishedAt: pubDate });
    }
  }

  return items.slice(0, 15);
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&hellip;/g, "\u2026");
}

function mentionsAI(title: string, content: string): boolean {
  const combined = (title + " " + content).toLowerCase();
  const aiTerms = ["ai", "artificial intelligence", "machine learning", "llm", "large language model",
    "chatgpt", "claude", "gemini", "gpt", "llama", "neural", "openai", "anthropic", "deepmind",
    "mistral", "deepseek", "model", "inference", "transformer", "generative"];
  return aiTerms.some(term => combined.includes(term));
}

async function runNewsIngestion() {
  if (isNewsIngestionRunning) return;
  isNewsIngestionRunning = true;

  try {
    const sources = await db.select().from(newsSourcesTable).where(eq(newsSourcesTable.active, true));

    for (const source of sources) {
      try {
        const items = await fetchRSSItems(source.url);

        for (const item of items) {
          if (!mentionsAI(item.title, item.content)) continue;

          const hash = crypto.createHash("sha256").update(`news:${item.sourceUrl}`).digest("hex");
          const [existing] = await db.select({ id: newsItemsTable.id }).from(newsItemsTable)
            .where(eq(newsItemsTable.deduplicationHash, hash));

          if (existing) continue;

          try {
            let classification;
            try {
              classification = await classifyNewsItem(
                item.title,
                item.content,
                source.name,
                source.sourceType,
              );
            } catch {
              classification = ruleBasedClassifyNews(item.title, item.content, source.name, source.sourceType);
            }

            await db.insert(newsItemsTable).values({
              title: item.title,
              summary: classification.summary,
              rawContent: item.content,
              sourceUrl: item.sourceUrl,
              sourceName: source.name,
              sourceType: source.sourceType,
              credibilityRating: classification.credibilityRating,
              credibilityReason: classification.credibilityReason,
              mentionedVendors: classification.mentionedVendors,
              publishedAt: item.publishedAt,
              highInterest: classification.highInterest,
              deduplicationHash: hash,
            });
          } catch {
            // skip item on classification error
          }
        }

        await db.update(newsSourcesTable)
          .set({ lastCheckedAt: new Date(), lastSuccessAt: new Date() })
          .where(eq(newsSourcesTable.id, source.id));
      } catch (err) {
        await db.update(newsSourcesTable)
          .set({ lastCheckedAt: new Date(), lastErrorAt: new Date(), lastError: String(err) })
          .where(eq(newsSourcesTable.id, source.id));
      }
    }
  } finally {
    isNewsIngestionRunning = false;
  }
}

router.get("/v1/news", async (req, res) => {
  try {
    const { credibility, vendor, highInterest, keyword } = req.query as Record<string, string>;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const conditions: SQL[] = [];

    if (credibility) {
      const ratings = credibility.split(",").map(r => r.trim()) as Array<"verified" | "likely" | "unverified" | "gossip">;
      if (ratings.length === 1) {
        conditions.push(eq(newsItemsTable.credibilityRating, ratings[0]));
      } else if (ratings.length > 1) {
        conditions.push(or(...ratings.map(r => eq(newsItemsTable.credibilityRating, r)))!);
      }
    }

    if (vendor) {
      // filter by mentionedVendors array containing the vendor name (case-insensitive substring)
      conditions.push(eq(newsItemsTable.mentionedVendors, [vendor] as unknown as string[]));
    }

    if (highInterest !== undefined) {
      conditions.push(eq(newsItemsTable.highInterest, highInterest === "true"));
    }

    if (keyword) {
      const term = `%${keyword}%`;
      conditions.push(
        or(
          ilike(newsItemsTable.title, term),
          ilike(newsItemsTable.summary, term),
          ilike(newsItemsTable.sourceName, term),
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.select()
      .from(newsItemsTable)
      .where(where)
      .orderBy(desc(newsItemsTable.detectedAt))
      .limit(limit)
      .offset(offset);

    res.json({ news: rows, total: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to fetch news" });
  }
});

router.post("/v1/news/trigger", async (req, res) => {
  if (isNewsIngestionRunning) {
    res.json({ started: false, message: "News ingestion already running" });
    return;
  }

  setImmediate(() => runNewsIngestion().catch(console.error));
  res.json({ started: true, message: "News ingestion started" });
});

router.get("/v1/news/status", async (req, res) => {
  try {
    const [lastItem] = await db.select({ detectedAt: newsItemsTable.detectedAt })
      .from(newsItemsTable)
      .orderBy(desc(newsItemsTable.detectedAt))
      .limit(1);

    res.json({
      isRunning: isNewsIngestionRunning,
      lastRunAt: lastItem?.detectedAt ?? null,
      totalItems: await db.select().from(newsItemsTable).then(r => r.length),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to get news status" });
  }
});

export { runNewsIngestion };
export default router;
