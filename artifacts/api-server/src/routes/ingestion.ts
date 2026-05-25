import { Router, type IRouter } from "express";
import { db, ingestionRunsTable, ingestionSourcesTable, vendorsTable, updatesTable, categoriesTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import crypto from "crypto";

const router: IRouter = Router();

let isIngestionRunning = false;

async function classifyAndSummarize(title: string, content: string, sourceUrl: string): Promise<{
  categorySlug: string;
  summary: string;
  whyItMatters: string | null;
  confidence: number;
  highImpact: boolean;
}> {
  const prompt = `You are classifying an AI product update. Given the following update, classify it into one of these categories and summarize it.

Categories:
- model-release: New model versions, capability upgrades, benchmark results
- api-changelog: Endpoint changes, deprecations, new parameters, SDK updates
- pricing: Rate changes, new tiers, free tier adjustments, credit changes
- safety: Usage policy updates, safety research, responsible AI announcements
- research: Papers, technical blog posts, research previews
- product: New features, partnerships, product launches

Update Title: ${title}
Source URL: ${sourceUrl}
Content (truncated): ${content.substring(0, 2000)}

Respond with JSON only:
{
  "category": "<one of the category slugs above>",
  "confidence": <0.0-1.0>,
  "summary": "<2-4 sentence plain English summary stating what changed, for which product, and why it matters>",
  "whyItMatters": "<one sentence for high-impact updates (model releases, pricing), or null>",
  "highImpact": <true/false>,
  "reasoning": "<brief reasoning>"
}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    categorySlug: parsed.category ?? "product",
    summary: parsed.summary ?? "",
    whyItMatters: parsed.whyItMatters ?? null,
    confidence: parsed.confidence ?? 0.5,
    highImpact: parsed.highImpact ?? false,
  };
}

async function fetchAndParseRSS(url: string): Promise<Array<{
  title: string;
  content: string;
  sourceUrl: string;
  publishedAt: Date | null;
}>> {
  const response = await fetch(url, {
    headers: { "User-Agent": "AIWatch/1.0 RSS Reader" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const text = await response.text();
  const items: Array<{ title: string; content: string; sourceUrl: string; publishedAt: Date | null }> = [];

  // Simple RSS/Atom parser using regex
  const itemMatches = text.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
  for (const match of itemMatches) {
    const item = match[1];
    const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description[^>]*>([\s\S]*?)<\/description>/i);
    const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

    const title = (titleMatch?.[1] ?? titleMatch?.[2] ?? "").trim();
    const link = (linkMatch?.[1] ?? "").trim();
    const desc = (descMatch?.[1] ?? descMatch?.[2] ?? "").replace(/<[^>]+>/g, " ").trim();
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()) : null;

    if (title && link) {
      items.push({ title, content: desc, sourceUrl: link, publishedAt: pubDate });
    }
  }

  // Also try Atom format
  if (items.length === 0) {
    const entryMatches = text.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi);
    for (const match of entryMatches) {
      const entry = match[1];
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/i);
      const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
      const publishedMatch = entry.match(/<published[^>]*>([\s\S]*?)<\/published>|<updated[^>]*>([\s\S]*?)<\/updated>/i);

      const title = (titleMatch?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
      const link = (linkMatch?.[1] ?? "").trim();
      const summary = (summaryMatch?.[1] ?? "").replace(/<[^>]+>/g, " ").trim();
      const pubDate = publishedMatch ? new Date((publishedMatch[1] ?? publishedMatch[2]).trim()) : null;

      if (title && link) {
        items.push({ title, content: summary, sourceUrl: link, publishedAt: pubDate });
      }
    }
  }

  return items.slice(0, 20); // Process at most 20 items per source
}

async function runIngestionForSource(sourceId: number, vendorId: number): Promise<{ created: number; errors: number }> {
  const [source] = await db.select().from(ingestionSourcesTable).where(eq(ingestionSourcesTable.id, sourceId));
  if (!source) return { created: 0, errors: 0 };

  let created = 0;
  let errors = 0;

  try {
    const items = await fetchAndParseRSS(source.url);

    for (const item of items) {
      try {
        const hash = crypto
          .createHash("sha256")
          .update(`${vendorId}:${item.sourceUrl}`)
          .digest("hex");

        // Check for dedup
        const [existing] = await db
          .select({ id: updatesTable.id })
          .from(updatesTable)
          .where(eq(updatesTable.deduplicationHash, hash));

        if (existing) continue;

        const { categorySlug, summary, whyItMatters, confidence, highImpact } = await classifyAndSummarize(
          item.title,
          item.content,
          item.sourceUrl
        );

        let [category] = await db
          .select()
          .from(categoriesTable)
          .where(eq(categoriesTable.slug, categorySlug));

        if (!category) {
          [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, "product"));
        }

        if (!category) continue;

        if (confidence < 0.70) {
          await db.insert(updatesTable).values({
            title: item.title,
            summary,
            rawContent: item.content,
            sourceUrl: item.sourceUrl,
            publishedAt: item.publishedAt,
            vendorId,
            categoryId: category.id,
            confidenceScore: confidence,
            flaggedForReview: true,
            highImpact,
            whyItMatters,
            deduplicationHash: hash,
          });
        } else {
          await db.insert(updatesTable).values({
            title: item.title,
            summary,
            rawContent: item.content,
            sourceUrl: item.sourceUrl,
            publishedAt: item.publishedAt,
            vendorId,
            categoryId: category.id,
            confidenceScore: confidence,
            flaggedForReview: false,
            highImpact,
            whyItMatters,
            deduplicationHash: hash,
          });
        }

        created++;
      } catch (itemErr) {
        console.error("[ingestion] item error:", String(itemErr));
        errors++;
      }
    }

    await db
      .update(ingestionSourcesTable)
      .set({ lastCheckedAt: new Date(), lastSuccessAt: new Date() })
      .where(eq(ingestionSourcesTable.id, sourceId));
  } catch (err) {
    errors++;
    await db
      .update(ingestionSourcesTable)
      .set({
        lastCheckedAt: new Date(),
        lastErrorAt: new Date(),
        lastError: String(err),
      })
      .where(eq(ingestionSourcesTable.id, sourceId));
  }

  return { created, errors };
}

async function runFullIngestion(vendorSlugs?: string[]) {
  if (isIngestionRunning) return;
  isIngestionRunning = true;

  const [run] = await db.insert(ingestionRunsTable).values({
    status: "running",
    itemsProcessed: 0,
    itemsCreated: 0,
    errors: 0,
  }).returning();

  let totalProcessed = 0;
  let totalCreated = 0;
  let totalErrors = 0;

  try {
    let sources = await db
      .select({
        source: ingestionSourcesTable,
        vendorId: ingestionSourcesTable.vendorId,
      })
      .from(ingestionSourcesTable)
      .leftJoin(vendorsTable, eq(ingestionSourcesTable.vendorId, vendorsTable.id))
      .where(eq(ingestionSourcesTable.active, true));

    if (vendorSlugs && vendorSlugs.length > 0) {
      sources = sources.filter(async (s) => {
        const [v] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, s.vendorId));
        return v && vendorSlugs.includes(v.slug);
      });
    }

    for (const { source } of sources) {
      const { created, errors } = await runIngestionForSource(source.id, source.vendorId);
      totalProcessed += created + errors;
      totalCreated += created;
      totalErrors += errors;
    }

    await db
      .update(ingestionRunsTable)
      .set({
        completedAt: new Date(),
        status: "completed",
        itemsProcessed: totalProcessed,
        itemsCreated: totalCreated,
        errors: totalErrors,
      })
      .where(eq(ingestionRunsTable.id, run.id));
  } catch (err) {
    await db
      .update(ingestionRunsTable)
      .set({
        completedAt: new Date(),
        status: "failed",
        itemsProcessed: totalProcessed,
        itemsCreated: totalCreated,
        errors: totalErrors + 1,
      })
      .where(eq(ingestionRunsTable.id, run.id));
  } finally {
    isIngestionRunning = false;
  }
}

router.post("/v1/ingestion/trigger", async (req, res) => {
  const { vendorSlugs } = (req.body ?? {}) as { vendorSlugs?: string[] };

  if (isIngestionRunning) {
    res.json({ started: false, message: "Ingestion already running", jobId: null });
    return;
  }

  const jobId = crypto.randomBytes(8).toString("hex");
  // Run in background
  setImmediate(() => runFullIngestion(vendorSlugs).catch(console.error));

  res.json({ started: true, message: "Ingestion started", jobId });
});

router.get("/v1/ingestion/status", async (req, res) => {
  try {
    const [lastRun] = await db
      .select()
      .from(ingestionRunsTable)
      .orderBy(desc(ingestionRunsTable.startedAt))
      .limit(1);

    const [queuedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ingestionSourcesTable)
      .where(eq(ingestionSourcesTable.active, true));

    res.json({
      isRunning: isIngestionRunning,
      lastRunAt: lastRun?.startedAt ?? null,
      lastRunItemsProcessed: lastRun?.itemsProcessed ?? 0,
      lastRunErrors: lastRun?.errors ?? 0,
      queuedVendors: queuedCount?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "internal_error", message: "Failed to get status" });
  }
});

export { runFullIngestion };
export default router;
