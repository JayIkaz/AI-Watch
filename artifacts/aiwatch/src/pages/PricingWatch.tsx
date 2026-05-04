import { useListUpdates } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { Loader2, DollarSign, Database } from "lucide-react";
import { useState } from "react";

export default function PricingWatch() {
  const [page, setPage] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const limit = 20;

  const { data, isLoading } = useListUpdates(
    { category: "pricing", limit, offset: page * limit },
    { query: { queryKey: ["/api/v1/updates/pricing", page], staleTime: 5 * 60 * 1000 } }
  );

  const visible = (data?.updates ?? []).filter(u => !hiddenIds.has(u.id));

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="mb-8 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-green-400/10 border border-green-400/20 shrink-0">
            <DollarSign className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Pricing Watch</h1>
            <p className="text-muted-foreground">
              Track price changes, new tiers, and cost announcements across all major AI vendors.
            </p>
            {data && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{data.total}</span> pricing updates tracked
              </p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading pricing updates...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
            <Database className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-foreground mb-1">No pricing updates found</p>
            <p className="text-sm text-center max-w-md">Pricing signals will appear here as they're detected.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {visible.map(u => (
              <UpdateCard key={u.id} update={u} onHide={() => setHiddenIds(p => new Set([...p, u.id]))} />
            ))}
            <div className="pt-8 flex items-center justify-between border-t border-border">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
              <span className="text-sm text-muted-foreground">Page {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!data || data.updates.length < limit} className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
