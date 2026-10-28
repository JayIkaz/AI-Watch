import type { Request, Response, NextFunction } from "express";

/**
 * Lets Vercel's CDN cache a public, user-independent GET route.
 *
 * Why: every cache miss starts (or wakes) a function instance, and each
 * instance opens its own database pool. The session-mode pooler allows 30
 * clients for the whole project, so a burst of parallel page loads can use
 * them all up (EMAXCONNSESSION -> 500). Serving repeat reads from the edge
 * keeps that traffic off the database.
 *
 * Only successful responses are cached. Caching a 500 would turn a short
 * blip into minutes of outage.
 *
 * Only use this on routes whose response does not depend on the caller
 * (nothing here reads req.user).
 */
export function publicCache(sMaxAge: number, staleWhileRevalidate: number) {
  const cacheable = `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;

  return (req: Request, res: Response, next: NextFunction) => {
    // Express answers HEAD through the matching GET handler, so allow both.
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    // A path can match more than one registration (e.g. /vendors/counts also
    // matches /vendors/:slug). The first one registered wins.
    if (res.locals.publicCacheApplied) {
      next();
      return;
    }
    res.locals.publicCacheApplied = true;

    const send = res.json.bind(res);
    res.json = (body?: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        res.setHeader("Cache-Control", cacheable);
        // The CDN strips s-maxage before the response reaches the client, so
        // expose the policy in a header that survives, for verification.
        res.setHeader("X-Cache-Policy", `${sMaxAge}/${staleWhileRevalidate}`);
      } else {
        res.setHeader("Cache-Control", "no-store");
      }
      return send(body);
    };

    next();
  };
}
