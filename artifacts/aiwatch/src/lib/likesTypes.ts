// GET /v1/likes and /v1/likes/items were never added to the OpenAPI spec that
// @workspace/api-client-react is generated from, so these response shapes
// have no generated type to import. Defined locally to match the actual
// server responses (artifacts/api-server/src/routes/likes.ts) until the spec
// is updated and these can be generated properly.

export interface LikeIds {
  updateIds: number[];
  newsIds: number[];
}

export interface LikedUpdateItem {
  id: number;
  title: string;
  summary: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  detectedAt: string;
  highImpact: boolean;
  whyItMatters: string | null;
  confidenceScore: number | null;
  flaggedForReview: boolean;
  vendor: { id: number; name: string; slug: string; logoUrl: string | null } | null;
  category: { id: number; name: string; slug: string; color: string | null } | null;
}

export interface LikedNews {
  id: number;
  title: string;
  summary: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  detectedAt: string;
  credibilityRating: string;
  credibilityReason: string | null;
  highInterest: boolean;
  mentionedVendors: string[] | null;
  sourceName: string;
  sourceType: string;
}

export interface LikedItems {
  updates: LikedUpdateItem[];
  news: LikedNews[];
}
