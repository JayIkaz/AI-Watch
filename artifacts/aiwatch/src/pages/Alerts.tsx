import { Layout } from "@/components/Layout";
import { Bell, Zap, ArrowRight, Plus } from "lucide-react";
import { Link } from "wouter";

const EXAMPLE_ALERTS = [
  { id: 1, name: "GPT-4 pricing changes", vendor: "OpenAI", category: "Pricing", active: true },
  { id: 2, name: "Claude API deprecations", vendor: "Anthropic", category: "API Changes", active: true },
  { id: 3, name: "High-impact model releases", vendor: "All vendors", category: "Model Releases", active: false },
];

export default function Alerts() {
  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-8 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Alerts</h1>
            <p className="text-muted-foreground">
              Get notified when specific vendors, categories, or keywords produce new intelligence.
            </p>
          </div>
        </div>

        {/* Create alert CTA */}
        <div className="bg-card border border-dashed border-primary/30 rounded-2xl p-6 mb-8 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 shrink-0">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-0.5">Create a new alert</p>
            <p className="text-xs text-muted-foreground">Set up alert keywords in Settings to get notified about specific updates.</p>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
          >
            Go to Settings <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Example alerts */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Alert Examples</h2>
          <div className="space-y-3">
            {EXAMPLE_ALERTS.map(alert => (
              <div key={alert.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full shrink-0 ${alert.active ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{alert.name}</p>
                  <p className="text-xs text-muted-foreground">{alert.vendor} · {alert.category}</p>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium border ${alert.active ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary text-muted-foreground border-border"}`}>
                  {alert.active ? "Active" : "Paused"}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Full alert management coming soon. Use Settings &gt; Alert Keywords for now.
          </p>
        </div>
      </div>
    </Layout>
  );
}
