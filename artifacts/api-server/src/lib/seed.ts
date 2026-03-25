import {
  db,
  vendorsTable,
  categoriesTable,
  ingestionSourcesTable,
  updatesTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";

const categories = [
  { slug: "model-release", name: "Model Release", description: "New model versions, capability upgrades, benchmark results", color: "#3B82F6" },
  { slug: "api-changelog", name: "API / Dev Changelog", description: "Endpoint changes, deprecations, new parameters, SDK updates", color: "#F97316" },
  { slug: "pricing", name: "Pricing Change", description: "Rate changes, new tiers, free tier adjustments, credit changes", color: "#22C55E" },
  { slug: "safety", name: "Safety & Policy", description: "Usage policy updates, safety research, responsible AI announcements", color: "#A855F7" },
  { slug: "research", name: "Research & Blog", description: "Papers, technical blog posts, research previews", color: "#6366F1" },
  { slug: "product", name: "Product Announcement", description: "New features, partnerships, product launches", color: "#EC4899" },
];

const vendors = [
  { slug: "anthropic", name: "Anthropic", tier: 1, active: true, description: "AI safety company building reliable, interpretable, and steerable AI systems. Creator of the Claude model family.", websiteUrl: "https://anthropic.com", sources: [{ sourceType: "rss", url: "https://www.anthropic.com/rss.xml" }] },
  { slug: "openai", name: "OpenAI", tier: 1, active: true, description: "AI research company building safe and beneficial artificial general intelligence. Creator of ChatGPT, GPT-4, and the o-series.", websiteUrl: "https://openai.com", sources: [{ sourceType: "rss", url: "https://openai.com/news/rss.xml" }] },
  { slug: "google-deepmind", name: "Google DeepMind", tier: 1, active: true, description: "Google's AI research lab combining DeepMind and Google Brain. Creator of the Gemini model family.", websiteUrl: "https://deepmind.google", sources: [{ sourceType: "rss", url: "https://blog.google/technology/ai/rss/" }] },
  { slug: "meta-ai", name: "Meta AI", tier: 1, active: true, description: "Meta's AI research division. Creator of the Llama open-source model series.", websiteUrl: "https://ai.meta.com", sources: [{ sourceType: "rss", url: "https://ai.meta.com/blog/rss/" }] },
  { slug: "mistral", name: "Mistral AI", tier: 1, active: true, description: "European AI company building efficient open and proprietary language models.", websiteUrl: "https://mistral.ai", sources: [{ sourceType: "rss", url: "https://mistral.ai/news/rss.xml" }] },
  { slug: "deepseek", name: "DeepSeek", tier: 1, active: true, description: "Chinese AI company known for high-performance open-source models rivaling frontier systems.", websiteUrl: "https://deepseek.com", sources: [{ sourceType: "rss", url: "https://api.deepseek.com/news/rss" }] },
  { slug: "replit", name: "Replit", tier: 1, active: true, description: "AI-first coding platform with collaborative development tools and deployment infrastructure.", websiteUrl: "https://replit.com", sources: [{ sourceType: "rss", url: "https://blog.replit.com/rss.xml" }] },
  { slug: "perplexity", name: "Perplexity AI", tier: 1, active: true, description: "AI-powered search engine providing real-time, cited answers.", websiteUrl: "https://perplexity.ai", sources: [{ sourceType: "rss", url: "https://blog.perplexity.ai/rss" }] },
  { slug: "xai", name: "xAI (Grok)", tier: 1, active: true, description: "Elon Musk's AI company, creator of the Grok large language model.", websiteUrl: "https://x.ai", sources: [{ sourceType: "rss", url: "https://x.ai/news/rss" }] },
  { slug: "huggingface", name: "Hugging Face", tier: 2, active: true, description: "Open-source AI platform for model sharing, datasets, and collaborative development.", websiteUrl: "https://huggingface.co", sources: [{ sourceType: "rss", url: "https://huggingface.co/blog/feed.xml" }] },
  { slug: "cohere", name: "Cohere", tier: 2, active: true, description: "Enterprise AI company providing NLP APIs for business applications.", websiteUrl: "https://cohere.com", sources: [{ sourceType: "rss", url: "https://cohere.com/blog/rss" }] },
  { slug: "together-ai", name: "Together AI", tier: 2, active: true, description: "Platform for running and fine-tuning open-source AI models at scale.", websiteUrl: "https://together.ai", sources: [{ sourceType: "rss", url: "https://www.together.ai/blog/rss" }] },
  { slug: "groq", name: "Groq", tier: 2, active: true, description: "AI chip company offering ultra-fast LLM inference via their Language Processing Units.", websiteUrl: "https://groq.com", sources: [{ sourceType: "rss", url: "https://groq.com/news/rss" }] },
  { slug: "replicate", name: "Replicate", tier: 2, active: true, description: "Cloud platform for running AI models via API with a massive model library.", websiteUrl: "https://replicate.com", sources: [{ sourceType: "rss", url: "https://replicate.com/changelog/rss" }] },
  { slug: "aws-bedrock", name: "AWS Bedrock", tier: 2, active: true, description: "Amazon's fully managed service for accessing foundation models from leading AI companies.", websiteUrl: "https://aws.amazon.com/bedrock", sources: [{ sourceType: "rss", url: "https://aws.amazon.com/new/feed/" }] },
  { slug: "azure-ai", name: "Azure AI", tier: 2, active: true, description: "Microsoft's cloud AI platform offering OpenAI models and other AI services.", websiteUrl: "https://azure.microsoft.com/ai", sources: [{ sourceType: "rss", url: "https://azure.microsoft.com/en-us/blog/tag/azure-ai/feed/" }] },
  { slug: "cursor", name: "Cursor", tier: 2, active: true, description: "AI-first code editor built to make developers more productive with AI pair programming.", websiteUrl: "https://cursor.sh", sources: [{ sourceType: "rss", url: "https://cursor.com/blog/rss" }] },
  { slug: "github-copilot", name: "GitHub Copilot", tier: 2, active: true, description: "AI coding assistant by GitHub and OpenAI, integrated into IDEs and GitHub.", websiteUrl: "https://github.com/features/copilot", sources: [{ sourceType: "rss", url: "https://github.blog/category/ai/feed/" }] },
];

const sampleUpdates = [
  { vendorSlug: "openai", categorySlug: "api-changelog", title: "GPT-4o Audio API now Generally Available", summary: "OpenAI has made the GPT-4o Audio API generally available, enabling developers to build applications with real-time voice input and output. The API supports multiple languages and integrates directly with the Chat Completions endpoint. Pricing is set at $100 per million audio tokens for input.", whyItMatters: "Developers can now build voice-first AI applications without third-party TTS/STT services — this unlocks a new class of real-time AI applications.", sourceUrl: "https://openai.com/blog/gpt-4o-audio-api", publishedAt: new Date("2025-03-01"), confidenceScore: 0.96, highImpact: true, flaggedForReview: false },
  { vendorSlug: "anthropic", categorySlug: "model-release", title: "Claude 3.5 Sonnet Sets New Benchmark Records", summary: "Anthropic's Claude 3.5 Sonnet achieves top scores across coding (SWE-bench), graduate-level reasoning (GPQA), and vision tasks. The model is 2x faster than Claude 3 Opus while operating at a lower price tier. Claude 3.5 Sonnet is now available via the API and on Claude.ai.", whyItMatters: "Claude 3.5 Sonnet outperforms every competitor model on coding benchmarks — a must-evaluate model for any AI-powered developer tooling.", sourceUrl: "https://www.anthropic.com/news/claude-3-5-sonnet", publishedAt: new Date("2024-10-22"), confidenceScore: 0.98, highImpact: true, flaggedForReview: false },
  { vendorSlug: "google-deepmind", categorySlug: "model-release", title: "Gemini 2.0 Flash Experimental Released with Multimodal Outputs", summary: "Google DeepMind released Gemini 2.0 Flash Experimental, featuring native multimodal output capabilities including text, audio, and images. The model has a 1M token context window and significantly improved performance on agentic tasks. Available in Google AI Studio and via API for developers.", whyItMatters: null, sourceUrl: "https://deepmind.google/gemini-2-0-flash", publishedAt: new Date("2024-12-11"), confidenceScore: 0.95, highImpact: false, flaggedForReview: false },
  { vendorSlug: "anthropic", categorySlug: "api-changelog", title: "Anthropic Launches Claude API Tool Use (Function Calling)", summary: "Anthropic has released tool use capabilities for the Claude API, allowing developers to provide Claude with external tools and have it automatically decide when and how to use them. Supports parallel tool execution and custom tool definitions via JSON schema. Available across all Claude 3 models.", whyItMatters: null, sourceUrl: "https://www.anthropic.com/news/tool-use", publishedAt: new Date("2025-02-24"), confidenceScore: 0.97, highImpact: false, flaggedForReview: false },
  { vendorSlug: "mistral", categorySlug: "model-release", title: "Mistral Large 2 Released: 123B Parameter Frontier Model", summary: "Mistral AI released Mistral Large 2, a 123B parameter model with strong performance on coding, math, and multilingual tasks. The model supports a 128K context window and is available under a research-use license. Commercial access is available via Mistral's API and major cloud providers.", whyItMatters: null, sourceUrl: "https://mistral.ai/news/mistral-large-2407", publishedAt: new Date("2024-07-24"), confidenceScore: 0.93, highImpact: false, flaggedForReview: false },
  { vendorSlug: "openai", categorySlug: "pricing", title: "OpenAI Reduces GPT-4o API Pricing by 50%", summary: "OpenAI announced a 50% price reduction for the GPT-4o API, bringing input costs down to $2.50 per million tokens and output to $10 per million tokens. The reduction applies immediately to all existing API users. This makes GPT-4o the most competitive frontier model by price.", whyItMatters: "A 50% price cut on the most widely used frontier model significantly lowers the cost of AI-powered applications — businesses should reassess their LLM provider economics.", sourceUrl: "https://openai.com/blog/gpt-4o-pricing", publishedAt: new Date("2024-10-01"), confidenceScore: 0.99, highImpact: true, flaggedForReview: false },
  { vendorSlug: "anthropic", categorySlug: "safety", title: "Anthropic Publishes Responsible Scaling Policy Update", summary: "Anthropic updated its Responsible Scaling Policy, introducing new evaluation thresholds for frontier models before deployment. The update includes stricter red-teaming requirements and new commitments around capability assessment. The policy now requires third-party audits for models above ASL-3.", whyItMatters: null, sourceUrl: "https://www.anthropic.com/news/rsp-update", publishedAt: new Date("2024-10-15"), confidenceScore: 0.91, highImpact: false, flaggedForReview: false },
  { vendorSlug: "huggingface", categorySlug: "product", title: "Hugging Face Launches Inference Endpoints v2 with Auto-Scaling", summary: "Hugging Face announced Inference Endpoints v2, adding automatic scaling based on request load, support for multi-GPU deployments, and improved cold-start times. The service now supports 100+ model architectures out of the box. Pricing starts at $0.06 per GPU-hour.", whyItMatters: null, sourceUrl: "https://huggingface.co/blog/inference-endpoints-v2", publishedAt: new Date("2025-01-10"), confidenceScore: 0.87, highImpact: false, flaggedForReview: false },
  { vendorSlug: "groq", categorySlug: "api-changelog", title: "Groq Adds Llama 3.3 70B to Inference API at Record Speeds", summary: "Groq added Meta's Llama 3.3 70B to its inference API, delivering speeds of over 400 tokens per second using LPU hardware. The model is available immediately to all API users at $0.59 per million input tokens. This maintains Groq's position as the fastest inference provider for large open-source models.", whyItMatters: null, sourceUrl: "https://groq.com/llama-3-3-70b", publishedAt: new Date("2025-02-05"), confidenceScore: 0.92, highImpact: false, flaggedForReview: false },
  { vendorSlug: "cursor", categorySlug: "product", title: "Cursor 0.43 Introduces Background Agent for Long-Running Tasks", summary: "Cursor released version 0.43 featuring Background Agent, which can run complex coding tasks autonomously while the developer continues working. The agent uses a sandboxed environment to safely execute and test code changes. Background Agent is available to all Pro and Business users.", whyItMatters: null, sourceUrl: "https://cursor.com/blog/background-agent", publishedAt: new Date("2025-02-28"), confidenceScore: 0.89, highImpact: false, flaggedForReview: false },
  { vendorSlug: "meta-ai", categorySlug: "model-release", title: "Meta Releases Llama 3.3 with Improved Multilingual Support", summary: "Meta released Llama 3.3, a 70B parameter model with significantly improved performance across 8 languages including German, French, Italian, Portuguese, Hindi, Spanish, and Thai. The model achieves GPT-4o level performance on multilingual benchmarks while remaining fully open-source. Weights are available on Hugging Face under the Meta Llama License.", whyItMatters: null, sourceUrl: "https://ai.meta.com/blog/llama-3-3", publishedAt: new Date("2024-12-06"), confidenceScore: 0.96, highImpact: false, flaggedForReview: false },
  { vendorSlug: "deepseek", categorySlug: "model-release", title: "DeepSeek-R1 Achieves GPT-o1 Level Performance at 20x Lower Cost", summary: "DeepSeek released R1, a reasoning model that matches OpenAI's o1 on most benchmarks while being released as open-source. The model was trained using novel reinforcement learning techniques without supervised fine-tuning for reasoning. API pricing is set at $0.55 per million tokens, roughly 20x cheaper than o1.", whyItMatters: "A frontier-class reasoning model available as open-source at a fraction of the cost fundamentally changes the economics of AI deployment — this is a landmark release.", sourceUrl: "https://github.com/deepseek-ai/DeepSeek-R1", publishedAt: new Date("2025-01-20"), confidenceScore: 0.97, highImpact: true, flaggedForReview: false },
  { vendorSlug: "azure-ai", categorySlug: "pricing", title: "Azure OpenAI Service Introduces Provisioned Throughput Units", summary: "Microsoft introduced Provisioned Throughput Units (PTUs) for Azure OpenAI Service, allowing enterprises to reserve guaranteed inference capacity. PTUs provide predictable latency and throughput for production workloads. Pricing is available through enterprise agreements starting at $2 per PTU per hour.", whyItMatters: null, sourceUrl: "https://azure.microsoft.com/blog/azure-openai-ptu", publishedAt: new Date("2024-11-20"), confidenceScore: 0.88, highImpact: false, flaggedForReview: false },
];

export async function autoSeed(log: (msg: string) => void): Promise<void> {
  const [{ vendorCount }] = await db
    .select({ vendorCount: count() })
    .from(vendorsTable);

  if (vendorCount > 0) {
    return;
  }

  log("Auto-seeding database with initial data...");

  for (const cat of categories) {
    await db.insert(categoriesTable).values(cat).onConflictDoNothing();
  }

  for (const v of vendors) {
    const { sources, ...vendorData } = v;
    const [vendor] = await db
      .insert(vendorsTable)
      .values(vendorData)
      .onConflictDoNothing()
      .returning();

    const vendorId = vendor?.id ?? (
      await db.select().from(vendorsTable).where(eq(vendorsTable.slug, v.slug))
    )[0]?.id;

    if (vendorId) {
      for (const src of sources) {
        await db
          .insert(ingestionSourcesTable)
          .values({ vendorId, ...src })
          .onConflictDoNothing();
      }
    }
  }

  for (const u of sampleUpdates) {
    const { vendorSlug, categorySlug, ...updateData } = u;
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.slug, vendorSlug));
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, categorySlug));
    if (!vendor || !category) continue;

    await db
      .insert(updatesTable)
      .values({
        ...updateData,
        vendorId: vendor.id,
        categoryId: category.id,
        deduplicationHash: `seed:${vendorSlug}:${updateData.title.substring(0, 50)}`,
      })
      .onConflictDoNothing();
  }

  log("Auto-seed complete: 18 vendors, 6 categories, 13 sample updates.");
}
