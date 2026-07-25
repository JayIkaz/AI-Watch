import { db, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const logosBySlug: Record<string, string> = {
  "anthropic": "anthropic.com",
  "openai": "openai.com",
  "google-deepmind": "deepmind.google",
  "meta-ai": "meta.com",
  "mistral": "mistral.ai",
  "deepseek": "deepseek.com",
  "replit": "replit.com",
  "xai": "x.ai",
  "perplexity": "perplexity.ai",
  "aws-bedrock": "aws.amazon.com",
  "azure-ai": "azure.microsoft.com",
  "cohere": "cohere.com",
  "cursor": "cursor.sh",
  "github-copilot": "github.com",
  "groq": "groq.com",
  "huggingface": "huggingface.co",
  "replicate": "replicate.com",
  "together-ai": "together.ai",
};

async function main() {
  for (const [slug, domain] of Object.entries(logosBySlug)) {
    const logoUrl = `https://logo.clearbit.com/${domain}`;
    const result = await db
      .update(vendorsTable)
      .set({ logoUrl })
      .where(eq(vendorsTable.slug, slug))
      .returning({ id: vendorsTable.id, name: vendorsTable.name });

    if (result.length === 0) {
      console.warn(`No vendor found for slug "${slug}" — skipped.`);
    } else {
      console.log(`Updated ${result[0].name} -> ${logoUrl}`);
    }
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
