import { useState } from "react";
import { useListUpdates, useListVendors, useListCategories } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { Filter, X, Loader2, Database, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Feed() {
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: updatesData, isLoading: isLoadingUpdates } = useListUpdates(
    {
      vendor: selectedVendors.join(",") || undefined,
      category: selectedCategories.join(",") || undefined,
      limit,
      offset: page * limit,
    },
    {
      query: {
        queryKey: ["/api/v1/updates", selectedVendors.join(","), selectedCategories.join(","), page],
      },
    }
  );

  const { data: vendorsData } = useListVendors({});
  const { data: categoriesData } = useListCategories({});

  const toggleVendor = (slug: string) => {
    setSelectedVendors(prev => prev.includes(slug) ? prev.filter(v => v !== slug) : [...prev, slug]);
    setPage(0);
  };

  const toggleCategory = (slug: string) => {
    setSelectedCategories(prev => prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug]);
    setPage(0);
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Feed Column */}
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Intelligence Feed</h1>
            <p className="text-muted-foreground">The latest AI model releases, API changes, and pricing updates.</p>
          </div>

          {isLoadingUpdates ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Scanning intelligence channels...</p>
            </div>
          ) : updatesData?.updates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
              <Database className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground mb-1">No intelligence found</p>
              <p className="text-sm text-center max-w-md">Adjust your filters or wait for the ingestion pipeline to pick up new updates.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {updatesData?.updates.map(update => (
                <UpdateCard key={update.id} update={update} />
              ))}

              <div className="pt-8 flex items-center justify-between border-t border-border">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!updatesData || updatesData.updates.length < limit}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="sticky top-24 bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-6 text-foreground font-display font-bold">
              <Filter className="w-4 h-4 text-primary" />
              Filters
              {(selectedVendors.length > 0 || selectedCategories.length > 0) && (
                <button 
                  onClick={() => { setSelectedVendors([]); setSelectedCategories([]); setPage(0); }}
                  className="ml-auto text-xs font-normal text-muted-foreground hover:text-foreground flex items-center gap-1 bg-secondary px-2 py-1 rounded-md"
                >
                  Clear all <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Categories</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {categoriesData?.categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-3 group cursor-pointer">
                      <div className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center transition-colors",
                        selectedCategories.includes(cat.slug) ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50 bg-background"
                      )}>
                        {selectedCategories.includes(cat.slug) && <CheckCircle2 className="w-3 h-3 text-background" />}
                      </div>
                      <span className={cn("text-sm transition-colors", selectedCategories.includes(cat.slug) ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground")}>
                        {cat.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Vendors</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {vendorsData?.vendors.map(vendor => (
                    <label key={vendor.id} className="flex items-center gap-3 group cursor-pointer">
                      <div className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                        selectedVendors.includes(vendor.slug) ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50 bg-background"
                      )}>
                        {selectedVendors.includes(vendor.slug) && <CheckCircle2 className="w-3 h-3 text-background" />}
                      </div>
                      <span className={cn("text-sm transition-colors truncate", selectedVendors.includes(vendor.slug) ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground")}>
                        {vendor.name}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground/50">{vendor.updateCount}</span>
                    </label>
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
