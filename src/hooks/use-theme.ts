import { useEffect, useEffectEvent, useState } from "react";

export type Theme = "light" | "dark" | "system";

const useTheme = () => {
  const [theme, setTheme] = useState<Theme>("light");

  const setThemeEffect = useEffectEvent((theme: Theme) => {
    const isDark =
      theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList[isDark ? "add" : "remove"]("dark");

    document.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme } }));

    setTheme(theme);
  });

  useEffect(() => {
    setThemeEffect(theme);
  }, [theme]);

  return [theme, setTheme] as const;
};

const useIsDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const handler = (e: CustomEvent<{ theme: Theme }>) => {
      setIsDarkMode(
        e.detail.theme === "dark" ||
          (e.detail.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    };
    document.addEventListener("theme-changed", handler as EventListener);
    return () => document.removeEventListener("theme-changed", handler as EventListener);
  }, []);

  return isDarkMode;
};

export { useTheme, useIsDarkMode };
