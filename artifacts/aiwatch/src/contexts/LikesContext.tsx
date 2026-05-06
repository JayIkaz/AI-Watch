import { createContext, useContext, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LikeIds } from "@workspace/api-client-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

export const LIKES_QK = ["/api/v1/likes"] as const;
export const LIKED_ITEMS_QK = ["/api/v1/likes/items"] as const;

interface LikesContextValue {
  likedUpdateIds: Set<number>;
  likedNewsIds: Set<number>;
  isLiked: (type: "update" | "news", id: number) => boolean;
  toggle: (type: "update" | "news", id: number) => Promise<void>;
}

const LikesContext = createContext<LikesContextValue>({
  likedUpdateIds: new Set(),
  likedNewsIds: new Set(),
  isLiked: () => false,
  toggle: async () => {},
});

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const qc = useQueryClient();

  const { data } = useQuery<LikeIds>({
    queryKey: LIKES_QK,
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/v1/likes", { signal, credentials: "include" });
      if (!res.ok) return { updateIds: [], newsIds: [] };
      return res.json();
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const likedUpdateIds = new Set<number>(data?.updateIds ?? []);
  const likedNewsIds = new Set<number>(data?.newsIds ?? []);

  const isLiked = useCallback(
    (type: "update" | "news", id: number) =>
      type === "update" ? likedUpdateIds.has(id) : likedNewsIds.has(id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  const toggle = useCallback(async (type: "update" | "news", id: number) => {
    const currently = type === "update" ? likedUpdateIds.has(id) : likedNewsIds.has(id);

    qc.setQueryData<LikeIds>(LIKES_QK, (old) => {
      if (!old) return old;
      if (currently) {
        return {
          updateIds: type === "update" ? old.updateIds.filter(x => x !== id) : old.updateIds,
          newsIds: type === "news" ? old.newsIds.filter(x => x !== id) : old.newsIds,
        };
      } else {
        return {
          updateIds: type === "update" ? [...old.updateIds, id] : old.updateIds,
          newsIds: type === "news" ? [...old.newsIds, id] : old.newsIds,
        };
      }
    });

    try {
      if (currently) {
        await fetch(`/api/v1/likes/${type}/${id}`, { method: "DELETE", credentials: "include" });
      } else {
        await fetch("/api/v1/likes", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType: type, itemId: id }),
        });
      }
      qc.invalidateQueries({ queryKey: LIKED_ITEMS_QK });
    } catch {
      qc.invalidateQueries({ queryKey: LIKES_QK });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, qc]);

  return (
    <LikesContext.Provider value={{ likedUpdateIds, likedNewsIds, isLiked, toggle }}>
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  return useContext(LikesContext);
}
