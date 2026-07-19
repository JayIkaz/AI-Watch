import {
  Building2,
  CalendarCheck,
  CalendarClock,
  FileEdit,
  FileText,
  Gavel,
  Landmark,
  Ruler,
  Scale,
} from "lucide-react";

export type RegulationType =
  | "legislation"
  | "enforcement"
  | "guidance"
  | "court_ruling"
  | "standards"
  | "executive_action";

export type Jurisdiction =
  | "eu"
  | "us_federal"
  | "us_state"
  | "uk"
  | "china"
  | "international";

export type Urgency =
  | "deadline_approaching"
  | "enforcement_live"
  | "proposed_draft"
  | "adopted_future";

export interface RegulationItem {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  regulationType: RegulationType;
  jurisdiction: Jurisdiction;
  jurisdictionDetail?: string;
  urgency: Urgency;
  deadlineDate?: string;
  deadlineLabel?: string;
  detectedAt: string;
  lastVerified: string;
  relevance: number;
  affectedVendors: string[];
  sourceUrl?: string;
  sourceName?: string;
}

interface TagConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.FC<{ className?: string }>;
}

export const REGULATION_TYPE_CONFIG: Record<RegulationType, TagConfig> = {
  legislation: {
    label: "Legislation & rulemaking",
    color: "text-violet",
    bg: "bg-violet/10",
    border: "border-violet/30",
    icon: Landmark,
  },
  enforcement: {
    label: "Enforcement actions",
    color: "text-raspberry",
    bg: "bg-raspberry/10",
    border: "border-raspberry/30",
    icon: Gavel,
  },
  guidance: {
    label: "Regulatory guidance",
    color: "text-sky",
    bg: "bg-sky/10",
    border: "border-sky/30",
    icon: FileText,
  },
  court_ruling: {
    label: "Court rulings & litigation",
    color: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/30",
    icon: Scale,
  },
  standards: {
    label: "Standards & frameworks",
    color: "text-teal",
    bg: "bg-teal/10",
    border: "border-teal/30",
    icon: Ruler,
  },
  executive_action: {
    label: "Executive & agency action",
    color: "text-violet",
    bg: "bg-violet/10",
    border: "border-violet/30",
    icon: Building2,
  },
};

export const URGENCY_CONFIG: Record<Urgency, TagConfig> = {
  deadline_approaching: {
    label: "Deadline",
    color: "text-raspberry",
    bg: "bg-raspberry/10",
    border: "border-raspberry/30",
    icon: CalendarClock,
  },
  enforcement_live: {
    label: "Enforcement live",
    color: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/30",
    icon: Gavel,
  },
  proposed_draft: {
    label: "Proposed draft",
    color: "text-sky",
    bg: "bg-sky/10",
    border: "border-sky/30",
    icon: FileEdit,
  },
  adopted_future: {
    label: "Adopted — pending",
    color: "text-teal",
    bg: "bg-teal/10",
    border: "border-teal/30",
    icon: CalendarCheck,
  },
};

export const JURISDICTION_CONFIG: Record<Jurisdiction, { label: string; short: string }> = {
  eu: { label: "European Union", short: "EU" },
  us_federal: { label: "US — Federal", short: "US" },
  us_state: { label: "US — State", short: "US-ST" },
  uk: { label: "United Kingdom", short: "UK" },
  china: { label: "China", short: "CN" },
  international: { label: "International", short: "INTL" },
};

export const ALL_REGULATION_TYPES = Object.keys(REGULATION_TYPE_CONFIG) as RegulationType[];
export const ALL_JURISDICTIONS = Object.keys(JURISDICTION_CONFIG) as Jurisdiction[];

const VENDOR_LABEL_OVERRIDES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "google-deepmind": "Google DeepMind",
  meta: "Meta",
  microsoft: "Microsoft",
  mistral: "Mistral",
  "stability-ai": "Stability AI",
};

export function vendorLabelFromSlug(slug: string): string {
  if (VENDOR_LABEL_OVERRIDES[slug]) return VENDOR_LABEL_OVERRIDES[slug];
  return slug
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const REGULATION_ITEMS: RegulationItem[] = [
  {
    id: "eu-ai-act-2026-obligations",
    title: "EU AI Act: high-risk and transparency obligations apply from 2 August 2026",
    summary:
      "The next major application date of the EU AI Act arrives on 2 August 2026, when obligations for high-risk AI systems and transparency requirements — including disclosure for AI-generated and manipulated content — become applicable across the EU.",
    whyItMatters:
      "Providers and deployers serving EU users have under two weeks to finalise conformity documentation, content-labelling, and disclosure workflows. Non-compliance exposes vendors to penalties of up to 3% of global annual turnover for most infringements.",
    regulationType: "legislation",
    jurisdiction: "eu",
    urgency: "deadline_approaching",
    deadlineDate: "2026-08-02",
    deadlineLabel: "EU AI Act high-risk & transparency rules apply",
    detectedAt: "2026-07-15T08:30:00Z",
    lastVerified: "2026-07-18T09:00:00Z",
    relevance: 0.96,
    affectedVendors: ["openai", "anthropic", "google", "meta", "mistral"],
    sourceUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    sourceName: "EUR-Lex",
  },
  {
    id: "eu-digital-omnibus-ai",
    title: "EU Digital Omnibus advances proposals to streamline AI Act implementation",
    summary:
      "The European Commission's Digital Omnibus package, which proposes targeted simplifications to EU digital rules including adjustments to AI Act implementation timelines and reporting duties, continues through the legislative process. Any changes would take effect after adoption by Parliament and Council.",
    whyItMatters:
      "If adopted, parts of the AI Act compliance burden could be phased differently than currently scheduled. Vendors should not assume relief: the 2 August 2026 application date stands unless and until an amendment enters into force.",
    regulationType: "legislation",
    jurisdiction: "eu",
    urgency: "adopted_future",
    detectedAt: "2026-07-10T14:00:00Z",
    lastVerified: "2026-07-17T16:30:00Z",
    relevance: 0.84,
    affectedVendors: ["openai", "anthropic", "google", "mistral"],
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/digital-omnibus",
    sourceName: "European Commission",
  },
  {
    id: "eu-intimate-content-prohibition",
    title:
      "EU prohibition on AI tools for non-consensual intimate imagery and CSAM takes effect 2 December 2026",
    summary:
      "New EU rules prohibiting AI systems designed or marketed to generate child sexual abuse material or non-consensual intimate imagery become applicable on 2 December 2026, with obligations extending to providers whose general-purpose tools lack adequate safeguards against such misuse.",
    whyItMatters:
      "Image- and video-generation providers must demonstrate effective misuse safeguards, not just terms-of-service bans. Expect audits of safety-filter efficacy and pressure on open-weight model distribution practices ahead of the December date.",
    regulationType: "legislation",
    jurisdiction: "eu",
    urgency: "deadline_approaching",
    deadlineDate: "2026-12-02",
    deadlineLabel: "EU ban on NCII/CSAM generation tools applies",
    detectedAt: "2026-07-08T11:00:00Z",
    lastVerified: "2026-07-16T10:00:00Z",
    relevance: 0.88,
    affectedVendors: ["openai", "google", "meta", "stability-ai"],
    sourceUrl: "https://eur-lex.europa.eu",
    sourceName: "EUR-Lex",
  },
  {
    id: "colorado-ai-act-enforcement",
    title:
      "Colorado AI Act now in force: attorney general enforcement underway for high-risk AI systems",
    summary:
      "Colorado's Artificial Intelligence Act (SB 24-205), the first comprehensive US state AI law, is now effective following its delayed start date of 30 June 2026. Developers and deployers of high-risk AI systems must use reasonable care to protect consumers from algorithmic discrimination, with enforcement by the Colorado Attorney General.",
    whyItMatters:
      "Any vendor whose models are deployed in consequential decisions (hiring, lending, housing, healthcare) affecting Colorado residents now faces active enforcement exposure. Impact assessments, developer disclosures, and incident notification duties apply today, not at a future date.",
    regulationType: "legislation",
    jurisdiction: "us_state",
    jurisdictionDetail: "Colorado",
    urgency: "enforcement_live",
    detectedAt: "2026-07-01T13:00:00Z",
    lastVerified: "2026-07-18T15:00:00Z",
    relevance: 0.91,
    affectedVendors: ["openai", "anthropic", "google", "microsoft"],
    sourceUrl: "https://leg.colorado.gov/bills/sb24-205",
    sourceName: "Colorado General Assembly",
  },
  {
    id: "us-eo-state-preemption",
    title: "Draft US executive order targets federal preemption of state AI laws",
    summary:
      "A draft executive order circulating within the administration would direct federal agencies to challenge state AI statutes seen as conflicting with federal policy and to condition certain federal funding on states pausing AI-specific regulation. The order has not been signed and its scope may change.",
    whyItMatters:
      "If signed, the order would set up litigation over laws like Colorado's AI Act and could freeze the state-level compliance landscape vendors are currently building for. Treat as a signal to monitor — draft orders frequently change before signature, and preemption via executive action faces significant legal challenges.",
    regulationType: "executive_action",
    jurisdiction: "us_federal",
    urgency: "proposed_draft",
    detectedAt: "2026-07-12T19:00:00Z",
    lastVerified: "2026-07-17T08:00:00Z",
    relevance: 0.82,
    affectedVendors: ["openai", "anthropic", "google", "meta", "microsoft"],
    sourceUrl: "https://www.whitehouse.gov/presidential-actions/",
    sourceName: "Press reporting",
  },
  {
    id: "nist-ai-rmf-update",
    title: "NIST advances update to the AI Risk Management Framework; comment period open",
    summary:
      "NIST is progressing a revision of its AI Risk Management Framework (AI RMF 1.0, 2023) to address generative-AI and agentic-system risks, with public comments on the draft update accepted until 15 September 2026. The framework remains voluntary but is widely referenced in US procurement and state legislation.",
    whyItMatters:
      "The AI RMF is the de facto baseline US enterprises cite in AI governance programs, and laws such as Colorado's reference recognised frameworks as a compliance defence. Vendors aligning documentation to the updated profile early will simplify enterprise-customer diligence.",
    regulationType: "standards",
    jurisdiction: "us_federal",
    urgency: "adopted_future",
    deadlineDate: "2026-09-15",
    deadlineLabel: "NIST AI RMF update — comment period closes",
    detectedAt: "2026-06-28T16:00:00Z",
    lastVerified: "2026-07-14T12:00:00Z",
    relevance: 0.86,
    affectedVendors: ["openai", "anthropic", "google", "microsoft", "meta"],
    sourceUrl: "https://www.nist.gov/itl/ai-risk-management-framework",
    sourceName: "NIST",
  },
];
