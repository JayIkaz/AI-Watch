// Vercel convention: any file under api/ becomes a serverless function.
// app.ts already exports a plain Express instance, which Vercel's Node
// runtime accepts directly as a request handler.
export { default } from "../src/app";
