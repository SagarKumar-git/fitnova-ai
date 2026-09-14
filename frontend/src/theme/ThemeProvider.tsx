/**
 * FitNova AI — Theme Provider
 * Integrated with Platform StorageService while maintaining 100% backward compatibility
 * with legacy localStorage keys ('fitnova-ui-theme').
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { StorageService } from "../platform/storage/StorageService.ts";

export type Theme = "dark" | "light" | "system";

export type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

export type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const storageService = new StorageService();

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "fitnova-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // 1. Try reading from Platform StorageService
    const stored = storageService.get("theme") as Theme | null;
    if (stored && ["dark", "light", "system"].includes(stored)) {
      return stored;
    }

    // 2. Backward-compatibility: Check legacy localStorage key
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const legacy = window.localStorage.getItem(storageKey) as Theme | null;
        if (legacy && ["dark", "light", "system"].includes(legacy)) {
          // Migrate to platform storage seamlessly
          storageService.set("theme", legacy);
          return legacy;
        }
      } catch {
        // Fall through
      }
    }

    return defaultTheme;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      // Write to both platform storage and legacy key for backward compatibility
      storageService.set("theme", newTheme);
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem(storageKey, newTheme);
        } catch {
          // Safe swallow
        }
      }
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
