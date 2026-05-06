import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [apiUnreachable, setApiUnreachable] = useState(false);
  const queryClient = useQueryClient();
  const successAfterErrorRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setApiUnreachable(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const unsubscribe = cache.subscribe((event) => {
      if (event.type === "updated") {
        const { status, error } = event.query.state;
        if (status === "error" && error) {
          const isNetworkError =
            (error instanceof TypeError && /fetch|network|failed/i.test(error.message)) ||
            (error instanceof Error && /network|ECONNREFUSED|ETIMEDOUT/i.test(error.message));
          if (isNetworkError) {
            setApiUnreachable(true);
            successAfterErrorRef.current = false;
          }
        } else if (status === "success") {
          if (!successAfterErrorRef.current) {
            successAfterErrorRef.current = true;
            setApiUnreachable(false);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  return { isOffline, apiUnreachable, showBanner: isOffline || apiUnreachable };
}
