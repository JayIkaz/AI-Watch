import { useListCategories } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { Layers, Activity } from "lucide-react";
import { cn, getCategoryColor } from "@/lib/utils";

export default function Categories() {
  const { data: categoriesData, isLoading } = useListCategories({});

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Update Categories</h1>
        <p className="text-muted-foreground">Browse intelligence by taxonomy.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoriesData?.categories.map(category => (
            <Link key={category.id} href={`/?category=${category.slug}`} className="group block">
              <div className="h-full bg-card rounded-2xl border border-border p-6 transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 relative overflow-hidden">
                
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-2.5 rounded-xl border", getCategoryColor(category.slug).replace('text-', 'text-').replace('bg-', 'bg-').replace('border-', 'border-'))}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    {category.updateCount}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{category.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {category.description || `All updates related to ${category.name.toLowerCase()}.`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
