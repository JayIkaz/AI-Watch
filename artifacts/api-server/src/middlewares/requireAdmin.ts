import { type Request, type Response, type NextFunction } from "express";

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

// Unlike every other route in this API (which use a soft-auth pattern and
// never hard-fail), admin-only routes are genuinely privileged actions
// (triggering ingestion, flagging content) and must hard-reject non-admins.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user?.email) {
    res.status(403).json({ error: "forbidden", message: "Admin access required" });
    return;
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.has(req.user.email.toLowerCase())) {
    res.status(403).json({ error: "forbidden", message: "Admin access required" });
    return;
  }

  next();
}
