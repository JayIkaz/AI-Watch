import { db, ingestionRunsTable, ingestionSourcesTable, vendorsTable, updatesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import crypto from "crypto";
import { fetchFeedItems } from "./rss";

function ruleBasedClassify(title: string, content: string, sourceUrl: string): {
  categorySlug: string;
  summary: string;
  whyItMatters: string | null;
  confidence: number;
  highImpact: boolean;
} {
  const text = `${title} ${content} ${sourceUrl}`.toLowerCase();

  let categorySlug = "product";
  let highImpact = false;
  let confidence = 0.6;

  if (/\bmodel\b|release|gpt-|claude-|gemini|llama|mistral|grok|haiku|sonnet|opus|version \d|\bv\d+\.\d+/.test(text)) {
    categorySlug = "model-release";
    highImpact = true;
    confidence = 0.72;
  } else if (/api|endpoint|deprecat|sdk|parameter|token limit|rate limit|changelog/.test(text)) {
    categorySlug = "api-changelog";
    confidence = 0.71;
  } else if (/pric|cost|credit|billing|tier|free|subscription|\$\d/.test(text)) {
    categorySlug = "pricing";
    highImpact = true;
    confidence = 0.75;
  } else if (/safety|policy|harm|abuse|guideline|responsible|alignment/.test(text)) {
    categorySlug = "safety";
    confidence = 0.70;
  } else if (/research|paper|arxiv|benchmark|evaluat|study|dataset/.test(text)) {
    categorySlug = "research";
    confidence = 0.70;
  }

  const summary = content.length > 20
    ? content.substring(0, 400).replace(/\s+/g, " ").trim()
    : title;

  const whyItMatters = highImpact
    ? `This is a significant update from the AI vendor that may affect your workflows.`
    : null;

  return { categorySlug, summary, whyItMatters, confidence, highImpact };
}

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
    // Fixed-shape JSON response (category/confidence/summary/whyItMatters/highImpact/reasoning)
    // never needs anywhere near the old 8192-token ceiling.
    max_tokens: 768,
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

async function classifyAndSummarizeWithFallback(title: string, content: string, sourceUrl: string): Promise<{
  categorySlug: string;
  summary: string;
  whyItMatters: string | null;
  confidence: number;
  highImpact: boolean;
}> {
  try {
    return await classifyAndSummarize(title, content, sourceUrl);
  } catch (err) {
    console.warn("[ingestion] Claude unavailable, using rule-based classifier:", String(err).substring(0, 80));
    return ruleBasedClassify(title, content, sourceUrl);
  }
}

async function runIngestionForSource(sourceId: number, vendorId: number): Promise<{ created: number; errors: number }> {
  const [source] = await db.select().from(ingestionSourcesTable).where(eq(ingestionSourcesTable.id, sourceId));
  if (!source) return { created: 0, errors: 0 };

  let created = 0;
  let errors = 0;

  try {
    const items = await fetchFeedItems(source.url, { maxItems: 20 });

    for (const item of items) {
      try {
        const hash = crypto
          .createHash("sha256")
          .update(`${vendorId}:${item.sourceUrl}`)
          .digest("hex");

        const [existing] = await db
          .select({ id: updatesTable.id })
          .from(updatesTable)
          .where(eq(updatesTable.deduplicationHash, hash));

        if (existing) continue;

        const { categorySlug, summary, whyItMatters, confidence, highImpact } = await classifyAndSummarizeWithFallback(
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

        await db.insert(updatesTable).values({
          title: item.title,
          summary,
          rawContent: item.content,
          sourceUrl: item.sourceUrl,
          publishedAt: item.publishedAt,
          vendorId,
          categoryId: category.id,
          confidenceScore: confidence,
          flaggedForReview: confidence < 0.70,
          highImpact,
          whyItMatters,
          deduplicationHash: hash,
        });

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

export async function runFullIngestion(vendorSlugs?: string[]): Promise<{ processed: number; created: number; errors: number }> {
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
      const allowedVendorIds = new Set(
        (await db.select().from(vendorsTable))
          .filter((v) => vendorSlugs.includes(v.slug))
          .map((v) => v.id),
      );
      sources = sources.filter((s) => allowedVendorIds.has(s.vendorId));
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
    throw err;
  }

  return { processed: totalProcessed, created: totalCreated, errors: totalErrors };
}
