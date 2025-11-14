import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark" | "system";

export function ModeToggle() {
  const [theme, setThemeState] = React.useState<Theme>("light");

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setThemeState(isDarkMode ? "dark" : "light");
  }, []);

  React.useEffect(() => {
    const isDark =
      theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList[isDark ? "add" : "remove"]("dark");
  }, [theme]);

  const toggleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setThemeState(themes[nextIndex]);
  };

  return (
    <Button variant="outline" size="icon" className="h-[40px] w-[40px]" onClick={() => toggleTheme()}>
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all ${theme === "light" ? "scale-100 rotate-0" : "scale-0 -rotate-90"}`}
      />
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${theme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90"}`}
      />
      <Monitor
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${theme === "system" ? "scale-100" : "scale-0"}`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
