import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import type { AuthUser } from "@workspace/api-zod";

const SUPABASE_URL = process.env.SUPABASE_URL;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

let jwks: JWTVerifyGetKey | null = null;
function getJwks(): JWTVerifyGetKey {
  if (!jwks) {
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL must be set to verify JWTs via JWKS");
    jwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

// Prefer local HS256 verification (SUPABASE_JWT_SECRET, no network call per
// request) over JWKS if the project still issues legacy shared-secret JWTs;
// fall back to JWKS for projects using asymmetric signing-key rotation.
// Confirm which mode the real project uses under Project Settings > API > JWT
// Settings before relying on this in production.
export async function verifySupabaseJwt(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = JWT_SECRET
      ? await jwtVerify(token, new TextEncoder().encode(JWT_SECRET))
      : await jwtVerify(token, getJwks());

    const sub = payload.sub;
    if (!sub) return null;

    const metadata = (payload.user_metadata as Record<string, unknown> | undefined) ?? {};
    const firstName = metadata.first_name ?? metadata.given_name;
    const lastName = metadata.last_name ?? metadata.family_name;
    const avatarUrl = metadata.avatar_url ?? metadata.picture;

    return {
      id: sub,
      email: typeof payload.email === "string" ? payload.email : null,
      firstName: typeof firstName === "string" ? firstName : null,
      lastName: typeof lastName === "string" ? lastName : null,
      profileImageUrl: typeof avatarUrl === "string" ? avatarUrl : null,
    };
  } catch {
    return null;
  }
}
