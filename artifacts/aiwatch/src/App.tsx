import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FeedPrefsProvider } from "@/contexts/FeedPrefsContext";
import { LikesProvider } from "@/contexts/LikesContext";
import Feed from "./pages/Feed";
import Vendors from "./pages/Vendors";
import VendorDetail from "./pages/VendorDetail";
import Categories from "./pages/Categories";
import Settings from "./pages/Settings";
import News from "./pages/News";
import Liked from "./pages/Liked";
import Login from "./pages/Login";
import NotFound from "./pages/not-found";
import DailyBrief from "./pages/DailyBrief";
import PricingWatch from "./pages/PricingWatch";
import ModelReleases from "./pages/ModelReleases";
import ApiChanges from "./pages/ApiChanges";
import RegulationPolicy from "./pages/RegulationPolicy";
import Alerts from "./pages/Alerts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Feed} />
      <Route path="/daily-brief" component={DailyBrief} />
      <Route path="/pricing" component={PricingWatch} />
      <Route path="/model-releases" component={ModelReleases} />
      <Route path="/api-changes" component={ApiChanges} />
      <Route path="/regulation" component={RegulationPolicy} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/vendors/:slug" component={VendorDetail} />
      <Route path="/categories" component={Categories} />
      <Route path="/news" component={News} />
      <Route path="/liked" component={Liked} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/settings" component={Settings} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <FeedPrefsProvider>
        <QueryClientProvider client={queryClient}>
          <LikesProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
          </LikesProvider>
        </QueryClientProvider>
      </FeedPrefsProvider>
    </ThemeProvider>
  );
}

export default App;
