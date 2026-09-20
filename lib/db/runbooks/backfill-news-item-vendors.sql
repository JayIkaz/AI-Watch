-- Seed vendor_aliases and backfill news_item_vendors.
--
-- Run once, after migration 0003. Idempotent: re-running adds nothing.
--
-- Context: news_items.mentioned_vendors is free text emitted by the classifier
-- and by a substring scan in newsIngestion.ts. It never matched the vendors
-- table, so ~1,500 vendor-attributed news items were invisible on vendor pages
-- while the data sat in the database. "Claude", "ChatGPT", "Gemini" and "Grok"
-- were the largest orphaned strings.
--
-- Aliases are lower-cased and matched exactly. Substring matching was rejected:
-- it maps "GPT" onto every ChatGPT story and "Meta" onto "metadata".
--
-- Deliberately excluded: "google", "microsoft", "aws". They are parent brands
-- whose coverage is mostly Maps, Search, Copilot, Ring and similar, so
-- attributing it to the AI subsidiary would make those vendor pages majority
-- irrelevant. Add them here if that judgement is ever revisited.

begin;

insert into vendor_aliases (vendor_id, alias)
select v.id, a.alias
from (values
  ('anthropic',      'anthropic'),
  ('anthropic',      'claude'),
  ('anthropic',      'anthropic (claude)'),
  ('anthropic',      'claude code'),
  ('anthropic',      'claude science'),
  ('openai',         'openai'),
  ('openai',         'chatgpt'),
  ('openai',         'codex'),
  ('openai',         'sora'),
  ('openai',         'gpt'),
  ('openai',         'gpt-6 astra'),
  ('openai',         'astra'),
  ('openai',         'gpt-5.6'),
  ('openai',         'gpt-5.6 sol'),
  ('openai',         'gpt 5.6'),
  ('openai',         'openai (chatgpt implied)'),
  ('openai',         'openai (codex)'),
  ('google-deepmind','google deepmind'),
  ('google-deepmind','deepmind'),
  ('google-deepmind','gemini'),
  ('google-deepmind','google gemini'),
  ('google-deepmind','google deepmind (gemini)'),
  ('google-deepmind','gemini 3.6 flash'),
  ('google-deepmind','gemini 3.5 flash-lite'),
  ('meta-ai',        'meta ai'),
  ('meta-ai',        'meta'),
  ('meta-ai',        'meta (muse spark model)'),
  ('mistral',        'mistral'),
  ('mistral',        'mistral ai'),
  ('deepseek',       'deepseek'),
  ('replit',         'replit'),
  ('perplexity',     'perplexity'),
  ('perplexity',     'perplexity ai'),
  ('xai',            'xai'),
  ('xai',            'x.ai'),
  ('xai',            'grok'),
  ('huggingface',    'huggingface'),
  ('huggingface',    'hugging face'),
  ('cohere',         'cohere'),
  ('together-ai',    'together ai'),
  ('groq',           'groq'),
  ('replicate',      'replicate'),
  ('aws-bedrock',    'aws bedrock'),
  ('aws-bedrock',    'amazon bedrock'),
  ('azure-ai',       'azure ai'),
  ('azure-ai',       'microsoft azure'),
  ('cursor',         'cursor'),
  ('github-copilot', 'github copilot'),
  ('github-copilot', 'github')
) as a(slug, alias)
join vendors v on v.slug = a.slug
on conflict (alias) do nothing;

insert into news_item_vendors (news_item_id, vendor_id)
select distinct n.id, va.vendor_id
from news_items n
cross join lateral unnest(n.mentioned_vendors) as m(mention)
join vendor_aliases va on va.alias = lower(btrim(m.mention))
on conflict do nothing;

commit;

-- Verification: rows per vendor, and how many mention strings remain unmatched.
--
-- select v.name, count(*) as items
-- from news_item_vendors niv join vendors v on v.id = niv.vendor_id
-- group by 1 order by 2 desc;
--
-- select lower(btrim(m.mention)) as unmatched, count(*)
-- from news_items n
-- cross join lateral unnest(n.mentioned_vendors) as m(mention)
-- left join vendor_aliases va on va.alias = lower(btrim(m.mention))
-- where va.id is null
-- group by 1 order by 2 desc limit 30;
