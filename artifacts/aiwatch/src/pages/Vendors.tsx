import { useListVendors } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { Cpu, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonVendorCard } from "@/components/SkeletonCard";

export default function Vendors() {
  const { data: vendorsData, isLoading } = useListVendors({});

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Tracked Vendors</h1>
        <p className="text-muted-foreground">Monitor updates from {vendorsData?.vendors.length || 0} top AI providers.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonVendorCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vendorsData?.vendors.map(vendor => (
            <Link key={vendor.id} href={`/vendors/${vendor.slug}`} className="group block">
              <div className="h-full bg-card rounded-2xl border border-border p-6 transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden">
                    {vendor.logoUrl ? (
                      <img src={vendor.logoUrl} alt={vendor.name} className="w-full h-full object-cover" />
                    ) : (
                      <Cpu className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border",
                    vendor.tier === 1 ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                    vendor.tier === 2 ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                    "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  )}>
                    Tier {vendor.tier}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{vendor.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
                  {vendor.description || "Leading AI capabilities and infrastructure provider."}
                </p>

                <div className="flex items-center justify-between text-xs mt-auto pt-4 border-t border-border/50">
                  <span className="text-muted-foreground font-medium">
                    {vendor.updateCount} updates
                  </span>
                  <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                    View feed <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
