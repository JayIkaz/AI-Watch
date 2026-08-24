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
import type {
  RegulationType,
  Jurisdiction,
  RegulationUrgency,
} from "@workspace/api-client-react";

// Item data now lives in the DB (regulation_items table) and is fetched via
// useListRegulations() — see @workspace/api-client-react for the RegulationItem
// type. This file stays purely presentational: icons, colours, labels, and
// the type/jurisdiction enums, re-exported here so existing imports across
// this section don't need to change.
export type { RegulationType, Jurisdiction, RegulationUrgency };
export type Urgency = RegulationUrgency;

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
