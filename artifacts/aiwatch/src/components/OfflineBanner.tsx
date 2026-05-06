import { WifiOff, AlertTriangle, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const { isOffline, apiUnreachable } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);
  const prevOutageRef = useRef(false);

  const outageActive = isOffline || apiUnreachable;

  useEffect(() => {
    if (outageActive && !prevOutageRef.current) {
      setDismissed(false);
    }
    prevOutageRef.current = outageActive;
  }, [outageActive]);

  const show = outageActive && !dismissed;

  if (!show) return null;

  const isApiOnly = !isOffline && apiUnreachable;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm border-b",
        isApiOnly
          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
      )}
    >
      {isApiOnly ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : (
        <WifiOff className="w-4 h-4 shrink-0" />
      )}
      <span className="flex-1">
        {isOffline
          ? "You're offline — showing cached data. Some features may be unavailable."
          : "Can't reach the server — showing cached data. Retrying in the background."}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
