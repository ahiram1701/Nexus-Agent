import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardV2 } from "@/pages/DashboardV2";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardV2} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="dark min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary-foreground">
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </div>
  );
}

export default App;
