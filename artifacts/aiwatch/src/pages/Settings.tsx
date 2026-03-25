import { useState } from "react";
import { useGetUserPreferences, useUpdateUserPreferences, useListApiKeys, useCreateApiKey, useDeleteApiKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Key, Save, AlertCircle, Trash2, Plus, Copy, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const prefsSchema = z.object({
  digestFrequency: z.enum(["none", "daily", "weekly"]),
  emailAlerts: z.boolean(),
  alertKeywords: z.string()
});

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"preferences" | "api">("preferences");
  
  // API Keys state
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Queries
  const { data: prefs, isLoading: prefsLoading } = useGetUserPreferences({});
  const { data: apiKeys, isLoading: keysLoading } = useListApiKeys({});
  
  // Mutations
  const updatePrefs = useUpdateUserPreferences();
  const createKey = useCreateApiKey();
  const deleteKey = useDeleteApiKey();

  // Form setup
  const form = useForm<z.infer<typeof prefsSchema>>({
    resolver: zodResolver(prefsSchema),
    values: prefs ? {
      digestFrequency: prefs.digestFrequency,
      emailAlerts: prefs.emailAlerts,
      alertKeywords: prefs.alertKeywords.join(", ")
    } : {
      digestFrequency: "none",
      emailAlerts: false,
      alertKeywords: ""
    }
  });

  const onSubmit = (values: z.infer<typeof prefsSchema>) => {
    updatePrefs.mutate({
      data: {
        digestFrequency: values.digestFrequency,
        emailAlerts: values.emailAlerts,
        alertKeywords: values.alertKeywords.split(",").map(k => k.trim()).filter(Boolean)
      }
    });
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    createKey.mutate({ data: { name: newKeyName } }, {
      onSuccess: (data) => {
        setCreatedKey(data.key);
        setNewKeyName("");
      }
    });
  };

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Account Settings</h1>
        <p className="text-muted-foreground">Manage your intelligence feed preferences and API access.</p>
      </div>

      <div className="flex border-b border-border mb-8">
        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === "preferences" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Alerts & Preferences
        </button>
        <button
          onClick={() => setActiveTab("api")}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === "api" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          API Keys
        </button>
      </div>

      {activeTab === "preferences" && (
        <div className="max-w-2xl bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg">
          {prefsLoading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-10 bg-secondary rounded-xl" />
              <div className="h-10 bg-secondary rounded-xl" />
              <div className="h-20 bg-secondary rounded-xl" />
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Digest Frequency</label>
                <select 
                  {...form.register("digestFrequency")}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="none">No Digest</option>
                  <option value="daily">Daily Summary</option>
                  <option value="weekly">Weekly Rollup</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-xl border border-border">
                <input 
                  type="checkbox" 
                  id="emailAlerts" 
                  {...form.register("emailAlerts")}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary bg-background"
                />
                <label htmlFor="emailAlerts" className="text-sm font-medium text-foreground cursor-pointer">
                  Enable high-impact email alerts
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Alert Keywords (comma separated)</label>
                <input 
                  type="text" 
                  {...form.register("alertKeywords")}
                  placeholder="e.g. gpt-4, pricing reduction, Llama 3"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-2">Get instantly notified if an update matches these exact keywords.</p>
              </div>

              <div className="pt-4 border-t border-border">
                <button 
                  type="submit"
                  disabled={updatePrefs.isPending}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {updatePrefs.isPending ? "Saving..." : <><Save className="w-4 h-4" /> Save Preferences</>}
                </button>
                {updatePrefs.isSuccess && <p className="text-green-400 text-sm mt-3">Preferences updated successfully.</p>}
              </div>

            </form>
          )}
        </div>
      )}

      {activeTab === "api" && (
        <div className="max-w-4xl space-y-8">
          
          {createdKey && (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-primary mb-2">Save your API Key</h3>
                  <p className="text-sm text-foreground/80 mb-4">
                    Please copy this key and store it somewhere safe. For security reasons, we cannot show it to you again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background border border-border px-4 py-2.5 rounded-lg text-primary font-mono text-sm flex-1 break-all">
                      {createdKey}
                    </code>
                    <button 
                      onClick={handleCopy}
                      className="p-2.5 bg-secondary hover:bg-white/10 rounded-lg border border-border transition-colors text-foreground"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setCreatedKey(null)}
                className="mt-6 text-sm text-muted-foreground hover:text-foreground underline"
              >
                I have saved my key
              </button>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg">
            <h3 className="text-xl font-display font-bold text-foreground mb-6">Create New Key</h3>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground mb-2">Key Name</label>
                <input 
                  type="text" 
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Backend"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button 
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || createKey.isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 h-[48px]"
              >
                <Plus className="w-4 h-4" /> Generate
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-secondary/30">
              <h3 className="font-semibold text-foreground">Active API Keys</h3>
            </div>
            
            {keysLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading keys...</div>
            ) : !apiKeys?.keys.length ? (
              <div className="p-12 text-center flex flex-col items-center">
                <Key className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-foreground font-medium">No API keys found</p>
                <p className="text-sm text-muted-foreground mt-1">Generate a key above to access the API.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Prefix</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                      <th className="px-6 py-3 font-medium">Last Used</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {apiKeys.keys.map(k => (
                      <tr key={k.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{k.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{k.keyPrefix}...</td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(k.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {k.lastUsedAt ? formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true }) : "Never"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              if (confirm(`Revoke key "${k.name}"? This action cannot be undone.`)) {
                                deleteKey.mutate({ id: k.id });
                              }
                            }}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors inline-block"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </Layout>
  );
}
