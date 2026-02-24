import { useLocation } from "preact-iso";
import { useMeta, useTitle } from "hoofd/preact";
import { HeroSection } from "./components/HeroSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { FaqSection } from "./components/FaqSection";

const META_DESCRIPTION =
  "Boris watches your JavaScript bundle sizes across every pull request — so bloat is caught before it ships, not after.";

export function Home() {
  const { route } = useLocation();

  useTitle("Boris — Bundle Size Tracker");
  useMeta({ name: "description", content: META_DESCRIPTION });
  useMeta({ property: "og:type", content: "website" });
  useMeta({ property: "og:title", content: "Boris — Bundle Size Tracker" });
  useMeta({ property: "og:description", content: META_DESCRIPTION });
  useMeta({ name: "twitter:card", content: "summary" });
  useMeta({ name: "twitter:title", content: "Boris — Bundle Size Tracker" });
  useMeta({ name: "twitter:description", content: META_DESCRIPTION });

  return (
    <>
      <HeroSection onGetStarted={() => route("/dashboard")} />
      <FeaturesSection />
      <HowItWorksSection />
      <FaqSection />
    </>
  );
}
