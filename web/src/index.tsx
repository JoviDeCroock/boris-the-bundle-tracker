import {
  LocationProvider,
  Router,
  Route,
  hydrate,
  prerender as ssr,
  useLocation,
  lazy,
} from "preact-iso";
import { createDispatcher, HoofdProvider } from "hoofd/preact";
import { QueryClientProvider } from "@tanstack/react-query";

import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { DashboardHeader } from "./components/DashboardHeader";
import { createQueryClient } from "./lib/query-client";
import "./style.css";
import { render } from "preact";

const Home = lazy(() => import("./pages/Home/index").then((module) => module.Home));
const Auth = lazy(() => import("./pages/Auth/index").then((module) => module.Auth));
const Dashboard = lazy(() => import("./pages/Dashboard/index").then((module) => module.Dashboard));
const Billing = lazy(() => import("./pages/Billing/index").then((module) => module.Billing));
const RepositoryPage = lazy(() =>
  import("./pages/Repository/index").then((module) => module.RepositoryPage),
);
const NotFound = lazy(() => import("./pages/_404").then((module) => module.NotFound));

function AppContent() {
  const { url } = useLocation();
  const shouldRenderBaseHeader = url === "/" || url === "/auth";

  return (
    <div class="bg-neutral-950 min-h-screen">
      {/* Show appropriate header based on route */}
      {shouldRenderBaseHeader ? <Header /> : <DashboardHeader />}

      <main>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/auth" component={Auth} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/billing" component={Billing} />
          <Route path="/repository/:id" component={RepositoryPage} />
          <Route default component={NotFound} />
        </Router>
      </main>

      {/* Show appropriate footer based on route */}
      {shouldRenderBaseHeader && <Footer />}
    </div>
  );
}

const queryClient = createQueryClient();
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        <AppContent />
      </LocationProvider>
    </QueryClientProvider>
  );
}

if (typeof window !== "undefined") {
  const appElement = document.getElementById("app");
  const path = window.location.pathname;
  if (path === "/" || path === "/auth") {
    hydrate(<App />, appElement);
  } else {
    appElement.innerHTML = "";
    render(<App />, appElement);
  }
}

export async function prerender(data) {
  const dispatcher = createDispatcher();
  const result = await ssr(
    <HoofdProvider value={dispatcher}>
      <App {...data} />
    </HoofdProvider>,
  );

  const { title, lang, metas, links } = dispatcher.toStatic();

  return {
    ...result,
    head: {
      lang,
      title,
      elements: new Set([
        ...metas.map((meta) => ({ type: "meta", props: meta })),
        ...links.map((link) => ({ type: "link", props: link })),
      ]),
    },
  };
}
