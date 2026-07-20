// Vercel convention: any file under api/ becomes a serverless function.
// Plain JS (not .ts) deliberately — Vercel doesn't type-check .js files here,
// which sidesteps a moduleResolution:"bundler" vs. Node's strict runtime ESM
// resolver mismatch that broke a .ts version of this file. Imports the
// esbuild-bundled output (produced by build.mjs, this project's "build"
// step), not the raw TS source — Node's ESM loader requires explicit file
// extensions and doesn't resolve directory imports the way a bundler does,
// so importing ../src/app directly fails at runtime even though it
// type-checks and looks fine locally.
export { default } from "../dist/app.mjs";
