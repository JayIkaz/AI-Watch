import { createContext, useContext, useState, ReactNode } from "react";

type Density = "comfortable" | "compact";

interface FeedPrefsContextValue {
  density: Density;
  setDensity: (d: Density) => void;
  highImpactOnly: boolean;
  setHighImpactOnly: (v: boolean) => void;
}

const FeedPrefsContext = createContext<FeedPrefsContextValue>({
  density: "comfortable",
  setDensity: () => {},
  highImpactOnly: false,
  setHighImpactOnly: () => {},
});

export function FeedPrefsProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>(() => {
    return (localStorage.getItem("aiwatch-density") as Density) ?? "comfortable";
  });

  const [highImpactOnly, setHighImpactOnlyState] = useState<boolean>(() => {
    return localStorage.getItem("aiwatch-high-impact") === "true";
  });

  const setDensity = (d: Density) => {
    localStorage.setItem("aiwatch-density", d);
    setDensityState(d);
  };

  const setHighImpactOnly = (v: boolean) => {
    localStorage.setItem("aiwatch-high-impact", String(v));
    setHighImpactOnlyState(v);
  };

  return (
    <FeedPrefsContext.Provider value={{ density, setDensity, highImpactOnly, setHighImpactOnly }}>
      {children}
    </FeedPrefsContext.Provider>
  );
}

export function useFeedPrefs() {
  return useContext(FeedPrefsContext);
}
