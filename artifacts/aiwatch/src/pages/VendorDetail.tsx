import { useParams } from "wouter";
import { useGetVendor, useListUpdates, getListUpdatesQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { UpdateCard } from "@/components/UpdateCard";
import { Cpu, ExternalLink, Activity, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function VendorDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: vendor, isLoading: isLoadingVendor } = useGetVendor(slug || "");
  const { data: updatesData, isLoading: isLoadingUpdates } = useListUpdates(
    { vendor: slug, limit: 50 },
    { query: { queryKey: getListUpdatesQueryKey({ vendor: slug, limit: 50 }), enabled: !!slug } }
  );

  if (isLoadingVendor) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-card rounded-2xl" />
          <div className="space-y-4">
            <div className="h-40 bg-card rounded-2xl" />
            <div className="h-40 bg-card rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!vendor) return <Layout><div className="p-8 text-center text-muted-foreground">Vendor not found</div></Layout>;

  return (
    <Layout>
      <Link href="/vendors" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Vendors
      </Link>

      <div className="relative bg-card border border-border rounded-3xl p-8 mb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-secondary border-2 border-border flex items-center justify-center overflow-hidden shadow-xl shadow-black/20">
            {vendor.logoUrl ? (
              <img src={vendor.logoUrl} alt={vendor.name} className="w-full h-full object-cover" />
            ) : (
              <Cpu className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-display font-bold text-foreground">{vendor.name}</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                Tier {vendor.tier}
              </span>
            </div>
            <p className="text-muted-foreground max-w-2xl mb-4">
              {vendor.description || "Monitoring all signals, model weights, and API endpoints from this provider."}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Activity className="w-4 h-4 text-primary" />
                {vendor.updateCount} Total Updates
              </div>
              {vendor.websiteUrl && (
                <a href={vendor.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <ExternalLink className="w-4 h-4" /> Official Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-display font-bold text-foreground border-b border-border pb-4">Intelligence Feed for {vendor.name}</h2>
        {isLoadingUpdates ? (
          <div className="text-center text-muted-foreground py-10">Loading updates...</div>
        ) : updatesData?.updates.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">No updates found for this vendor.</div>
        ) : (
          updatesData?.updates.map(update => (
            <UpdateCard key={update.id} update={update} />
          ))
        )}
      </div>
    </Layout>
  );
}
