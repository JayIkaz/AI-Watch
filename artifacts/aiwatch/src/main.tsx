import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Call the API on its own origin rather than being proxied through this
// project's /api/* rewrite.
//
// The rewrite was same-origin and convenient, but it made every API call bill
// two CDN edge requests: one here, where the rewrite was received, and another
// on the API server's own project, where it was forwarded. Calling the API
// directly bills one.
//
// Left unset (local dev, and any preview without the variable) this is a no-op
// and the client keeps using relative /api/* paths, so nothing changes there.
const apiOrigin = import.meta.env.VITE_API_ORIGIN;
if (apiOrigin) {
  setBaseUrl(apiOrigin);
}

createRoot(document.getElementById("root")!).render(<App />);
