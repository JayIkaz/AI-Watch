import { db, newsItemsTable, newsSourcesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import crypto from "crypto";
import { fetchFeedItems } from "./rss";

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

function mentionsAI(title: string, content: string): boolean {
  const combined = (title + " " + content).toLowerCase();
  const aiTerms = ["ai", "artificial intelligence", "machine learning", "llm", "large language model",
    "chatgpt", "claude", "gemini", "gpt", "llama", "neural", "openai", "anthropic", "deepmind",
    "mistral", "deepseek", "model", "inference", "transformer", "generative"];
  return aiTerms.some(term => combined.includes(term));
}

export async function runNewsIngestion(): Promise<{ processed: number; created: number; errors: number }> {
  let processed = 0;
  let created = 0;
  let errors = 0;

  const sources = await db.select().from(newsSourcesTable).where(eq(newsSourcesTable.active, true));

  for (const source of sources) {
    try {
      const items = await fetchFeedItems(source.url, { maxItems: 15 });

      for (const item of items) {
        if (!mentionsAI(item.title, item.content)) continue;

        const hash = crypto.createHash("sha256").update(`news:${item.sourceUrl}`).digest("hex");
        const [existing] = await db.select({ id: newsItemsTable.id }).from(newsItemsTable)
          .where(eq(newsItemsTable.deduplicationHash, hash));

        if (existing) continue;

        processed++;
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
          created++;
        } catch (itemErr) {
          console.error("[news-ingestion] item error:", String(itemErr));
          errors++;
        }
      }

      await db.update(newsSourcesTable)
        .set({ lastCheckedAt: new Date(), lastSuccessAt: new Date() })
        .where(eq(newsSourcesTable.id, source.id));
    } catch (err) {
      errors++;
      await db.update(newsSourcesTable)
        .set({ lastCheckedAt: new Date(), lastErrorAt: new Date(), lastError: String(err) })
        .where(eq(newsSourcesTable.id, source.id));
    }
  }

  return { processed, created, errors };
}
