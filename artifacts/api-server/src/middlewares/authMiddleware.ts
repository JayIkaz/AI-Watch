import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { verifySupabaseJwt } from "../lib/supabaseAuth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

// Every route in this API relies on a soft-auth contract: guest users get a
// benign default, never a hard 401/403 (requireAdmin is the one deliberate
// exception, for genuinely privileged actions). Preserve that here — any
// verification failure just leaves req.user unset instead of rejecting.
export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (token) {
    const user = await verifySupabaseJwt(token);
    if (user) req.user = user;
  }

  next();
}
