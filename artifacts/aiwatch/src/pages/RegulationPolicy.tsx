import { useMemo, useState } from "react";
import { format, formatDistanceToNow, isBefore, parseISO, startOfToday } from "date-fns";
import { CalendarClock, Filter, Scale, X } from "lucide-react";
import { useListVendors, getListVendorsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { RegulationCard } from "@/components/RegulationCard";
import { cn } from "@/lib/utils";
import {
  ALL_JURISDICTIONS,
  ALL_REGULATION_TYPES,
  JURISDICTION_CONFIG,
  REGULATION_ITEMS,
  REGULATION_TYPE_CONFIG,
  vendorLabelFromSlug,
  type Jurisdiction,
  type RegulationItem,
  type RegulationType,
} from "@/data/regulations";

// ── Compliance calendar ───────────────────────────────────────────────────────
function ComplianceCalendar({
  entries,
  selectedId,
  onSelect,
}: {
  entries: RegulationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-2">
        <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Compliance calendar
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
        {entries.map(item => {
          const date = parseISO(item.deadlineDate!);
          const selected = selectedId === item.id;
          const jurisdictionShort = item.jurisdictionDetail
            ? `${JURISDICTION_CONFIG[item.jurisdiction].short} · ${item.jurisdictionDetail}`
            : JURISDICTION_CONFIG[item.jurisdiction].short;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "shrink-0 w-52 text-left rounded-2xl border p-3 bg-card transition-all",
                selected
                  ? "border-raspberry/50 bg-raspberry/5 ring-1 ring-raspberry/20"
                  : "border-border hover:border-raspberry/30 hover:-translate-y-0.5"
              )}
            >
              <div className="text-sm font-bold text-raspberry tabular-nums">
                {format(date, "d MMM yyyy")}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(date, { addSuffix: true })}
              </div>
              <div className="text-xs font-medium text-foreground line-clamp-2 mt-1">
                {item.deadlineLabel ?? item.title}
              </div>
              <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                {jurisdictionShort}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sidebar filter row ────────────────────────────────────────────────────────
function FilterRow({
  active,
  onClick,
  icon,
  label,
  count,
  activeClass,
  indent,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  count: number;
  activeClass?: string;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={count === 0 && !active}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm border transition-all text-left",
        indent && "ml-5 w-[calc(100%-1.25rem)]",
        active
          ? activeClass ?? "bg-primary/10 border-primary/30 text-primary font-medium"
          : count === 0
          ? "bg-background border-border text-muted-foreground opacity-40 cursor-not-allowed"
          : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5"
      )}
    >
      {icon}
      <span className="flex-1 min-w-0 truncate">{label}</span>
      <span className={cn(
        "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums",
        active ? "bg-current/20" : "bg-muted text-muted-foreground"
      )}>
        {count}
      </span>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RegulationPolicy() {
  const [selectedTypes, setSelectedTypes] = useState<Set<RegulationType>>(new Set());
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<Set<Jurisdiction>>(new Set());
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [calendarItemId, setCalendarItemId] = useState<string | null>(null);

  const { data: vendorsData } = useListVendors({}, {
    query: { queryKey: getListVendorsQueryKey({}), staleTime: 5 * 60 * 1000, retry: false },
  });
  const vendorNames = useMemo(
    () => new Map((vendorsData?.vendors ?? []).map(v => [v.slug, v.name])),
    [vendorsData]
  );

  function toggleInSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const matchesType = (i: RegulationItem, types: Set<RegulationType>) =>
    types.size === 0 || types.has(i.regulationType);

  const matchesJurisdiction = (
    i: RegulationItem,
    jurisdictions: Set<Jurisdiction>,
    states: Set<string>
  ) => {
    if (jurisdictions.size === 0 && states.size === 0) return true;
    if (states.size > 0 && i.jurisdiction === "us_state") {
      return states.has(i.jurisdictionDetail ?? "");
    }
    return jurisdictions.has(i.jurisdiction);
  };

  const matchesVendor = (i: RegulationItem, vendors: Set<string>) =>
    vendors.size === 0 || i.affectedVendors.some(v => vendors.has(v));

  const filtered = useMemo(() => {
    if (calendarItemId) {
      return REGULATION_ITEMS.filter(i => i.id === calendarItemId);
    }
    return REGULATION_ITEMS.filter(i =>
      matchesType(i, selectedTypes) &&
      matchesJurisdiction(i, selectedJurisdictions, selectedStates) &&
      matchesVendor(i, selectedVendors)
    );
  }, [calendarItemId, selectedTypes, selectedJurisdictions, selectedStates, selectedVendors]);

  // Faceted counts: each facet's counts ignore its own selections but apply the others.
  const typeCounts = useMemo(() => {
    const base = REGULATION_ITEMS.filter(i =>
      matchesJurisdiction(i, selectedJurisdictions, selectedStates) && matchesVendor(i, selectedVendors)
    );
    return new Map(ALL_REGULATION_TYPES.map(t => [t, base.filter(i => i.regulationType === t).length]));
  }, [selectedJurisdictions, selectedStates, selectedVendors]);

  const jurisdictionCounts = useMemo(() => {
    const base = REGULATION_ITEMS.filter(i =>
      matchesType(i, selectedTypes) && matchesVendor(i, selectedVendors)
    );
    return new Map(ALL_JURISDICTIONS.map(j => [j, base.filter(i => i.jurisdiction === j).length]));
  }, [selectedTypes, selectedVendors]);

  const stateOptions = useMemo(() => {
    const states = new Set<string>();
    REGULATION_ITEMS.forEach(i => {
      if (i.jurisdiction === "us_state" && i.jurisdictionDetail) states.add(i.jurisdictionDetail);
    });
    return [...states].sort();
  }, []);

  const vendorOptions = useMemo(() => {
    const slugs = new Set<string>();
    REGULATION_ITEMS.forEach(i => i.affectedVendors.forEach(v => slugs.add(v)));
    return [...slugs].sort();
  }, []);

  const vendorCounts = useMemo(() => {
    const base = REGULATION_ITEMS.filter(i =>
      matchesType(i, selectedTypes) && matchesJurisdiction(i, selectedJurisdictions, selectedStates)
    );
    return new Map(vendorOptions.map(v => [v, base.filter(i => i.affectedVendors.includes(v)).length]));
  }, [selectedTypes, selectedJurisdictions, selectedStates, vendorOptions]);

  const upcomingDeadlines = useMemo(() => {
    const today = startOfToday();
    return REGULATION_ITEMS
      .filter(i => i.deadlineDate && !isBefore(parseISO(i.deadlineDate), today))
      .sort((a, b) => a.deadlineDate!.localeCompare(b.deadlineDate!))
      .slice(0, 5);
  }, []);

  const hasActiveFilters =
    selectedTypes.size > 0 ||
    selectedJurisdictions.size > 0 ||
    selectedStates.size > 0 ||
    selectedVendors.size > 0 ||
    calendarItemId !== null;

  const clearAllFilters = () => {
    setSelectedTypes(new Set());
    setSelectedJurisdictions(new Set());
    setSelectedStates(new Set());
    setSelectedVendors(new Set());
    setCalendarItemId(null);
  };

  const pinnedItem = calendarItemId ? REGULATION_ITEMS.find(i => i.id === calendarItemId) : null;

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-8">

        {/* ── Main column ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Header */}
          <div className="mb-6 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-violet/10 border border-violet/20 shrink-0">
              <Scale className="w-6 h-6 text-violet" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-display font-bold text-foreground mb-1">Regulation & Policy</h1>
              <p className="text-muted-foreground">
                AI regulation, enforcement, and standards across the EU, US, UK, China, and international bodies — with compliance deadlines tracked.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{filtered.length}</span> of {REGULATION_ITEMS.length} regulatory signals
              </p>
            </div>
          </div>

          {/* Compliance calendar */}
          <ComplianceCalendar
            entries={upcomingDeadlines}
            selectedId={calendarItemId}
            onSelect={id => setCalendarItemId(prev => (prev === id ? null : id))}
          />

          {/* Mobile filter chip strip */}
          <div className="lg:hidden -mx-4 px-4 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {ALL_REGULATION_TYPES.map(t => {
                const cfg = REGULATION_TYPE_CONFIG[t];
                const active = selectedTypes.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleInSet(setSelectedTypes, t)}
                    className={cn(
                      "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      active ? cn(cfg.bg, cfg.border, cfg.color) : "bg-card border-border text-muted-foreground"
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
              {ALL_JURISDICTIONS.map(j => {
                const cfg = JURISDICTION_CONFIG[j];
                const active = selectedJurisdictions.has(j);
                return (
                  <button
                    key={j}
                    onClick={() => toggleInSet(setSelectedJurisdictions, j)}
                    className={cn(
                      "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      active ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground"
                    )}
                  >
                    {cfg.short}
                  </button>
                );
              })}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground bg-card"
                >
                  Clear <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Pinned deadline indicator */}
          {pinnedItem && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Pinned deadline:</span>
              <button
                onClick={() => setCalendarItemId(null)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium text-raspberry bg-raspberry/10 border-raspberry/30"
              >
                <CalendarClock className="w-3 h-3" />
                {pinnedItem.deadlineLabel ?? pinnedItem.title} ×
              </button>
            </div>
          )}

          {/* Feed */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-2xl">
              <Scale className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground mb-1">No regulatory signals match these filters</p>
              <p className="text-sm text-center max-w-md">Try clearing filters or widening your jurisdiction selection.</p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {filtered.map(item => (
                <RegulationCard key={item.id} item={item} vendorNames={vendorNames} />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar (desktop) ────────────────────────────────────────────── */}
        <div className="hidden lg:block w-full lg:w-72 shrink-0">
          <div className="sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto space-y-4 pr-1">
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Filters</h3>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear all
                  </button>
                )}
              </div>

              {/* Regulation type */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Regulation type</h4>
                <div className="space-y-1.5">
                  {ALL_REGULATION_TYPES.map(t => {
                    const cfg = REGULATION_TYPE_CONFIG[t];
                    const Icon = cfg.icon;
                    return (
                      <FilterRow
                        key={t}
                        active={selectedTypes.has(t)}
                        onClick={() => toggleInSet(setSelectedTypes, t)}
                        icon={<Icon className="w-3.5 h-3.5 shrink-0" />}
                        label={cfg.label}
                        count={typeCounts.get(t) ?? 0}
                        activeClass={cn(cfg.bg, cfg.border, cfg.color, "font-medium")}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Jurisdiction */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jurisdiction</h4>
                <div className="space-y-1.5">
                  {ALL_JURISDICTIONS.map(j => {
                    const cfg = JURISDICTION_CONFIG[j];
                    return (
                      <div key={j}>
                        <FilterRow
                          active={selectedJurisdictions.has(j)}
                          onClick={() => toggleInSet(setSelectedJurisdictions, j)}
                          label={cfg.label}
                          count={jurisdictionCounts.get(j) ?? 0}
                        />
                        {j === "us_state" && stateOptions.map(state => (
                          <div key={state} className="mt-1.5">
                            <FilterRow
                              indent
                              active={selectedStates.has(state)}
                              onClick={() => toggleInSet(setSelectedStates, state)}
                              label={state}
                              count={REGULATION_ITEMS.filter(i => i.jurisdictionDetail === state).length}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Affected vendors */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Affected vendors</h4>
                <div className="space-y-1.5">
                  {vendorOptions.map(slug => (
                    <FilterRow
                      key={slug}
                      active={selectedVendors.has(slug)}
                      onClick={() => toggleInSet(setSelectedVendors, slug)}
                      label={vendorNames.get(slug) ?? vendorLabelFromSlug(slug)}
                      count={vendorCounts.get(slug) ?? 0}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
