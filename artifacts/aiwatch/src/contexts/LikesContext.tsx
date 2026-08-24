import { createContext, useContext, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LikeIds } from "@/lib/likesTypes";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export const LIKES_QK = ["/api/v1/likes"] as const;
export const LIKED_ITEMS_QK = ["/api/v1/likes/items"] as const;

type LikeType = "update" | "news" | "regulation";

// Maps a like type to its field name in the LikeIds/toggle payload shape.
const FIELD: Record<LikeType, keyof LikeIds> = {
  update: "updateIds",
  news: "newsIds",
  regulation: "regulationIds",
};

interface LikesContextValue {
  likedUpdateIds: Set<number>;
  likedNewsIds: Set<number>;
  likedRegulationIds: Set<number>;
  isLiked: (type: LikeType, id: number) => boolean;
  toggle: (type: LikeType, id: number) => Promise<void>;
}

const LikesContext = createContext<LikesContextValue>({
  likedUpdateIds: new Set(),
  likedNewsIds: new Set(),
  likedRegulationIds: new Set(),
  isLiked: () => false,
  toggle: async () => {},
});

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const qc = useQueryClient();
  const { toast } = useToast();
  const goToLogin = () => {
    window.location.href = `${import.meta.env.BASE_URL}login`;
  };

  const { data } = useQuery<LikeIds>({
    queryKey: LIKES_QK,
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/v1/likes", { signal, headers: await authHeaders() });
      if (!res.ok) return { updateIds: [], newsIds: [], regulationIds: [] };
      return res.json();
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const likedUpdateIds = new Set<number>(data?.updateIds ?? []);
  const likedNewsIds = new Set<number>(data?.newsIds ?? []);
  const likedRegulationIds = new Set<number>(data?.regulationIds ?? []);

  const likedSetFor = (type: LikeType) =>
    type === "update" ? likedUpdateIds : type === "news" ? likedNewsIds : likedRegulationIds;

  const isLiked = useCallback(
    (type: LikeType, id: number) => likedSetFor(type).has(id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  const toggle = useCallback(async (type: LikeType, id: number) => {
    if (!user) {
      toast({
        title: "Log in to save items",
        description: "Create a free account to save updates and come back to them later.",
        action: (
          <ToastAction altText="Log in" onClick={goToLogin}>
            Log in
          </ToastAction>
        ),
      });
      return;
    }

    const field = FIELD[type];
    const currently = likedSetFor(type).has(id);

    qc.setQueryData<LikeIds>(LIKES_QK, (old) => {
      if (!old) return old;
      return {
        ...old,
        [field]: currently
          ? old[field].filter(x => x !== id)
          : [...old[field], id],
      };
    });

    try {
      const auth = await authHeaders();
      if (currently) {
        await fetch(`/api/v1/likes/${type}/${id}`, { method: "DELETE", headers: auth });
      } else {
        await fetch("/api/v1/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth },
          body: JSON.stringify({ itemType: type, itemId: id }),
        });
      }
      qc.invalidateQueries({ queryKey: LIKED_ITEMS_QK });
    } catch {
      qc.invalidateQueries({ queryKey: LIKES_QK });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, qc, user, toast]);

  return (
    <LikesContext.Provider value={{ likedUpdateIds, likedNewsIds, likedRegulationIds, isLiked, toggle }}>
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  return useContext(LikesContext);
}
