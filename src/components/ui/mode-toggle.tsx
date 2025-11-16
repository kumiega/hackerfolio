import { Moon, Sun, Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Theme } from "@/hooks/use-theme";
import { useTheme } from "@/hooks/use-theme";

export function ModeToggle() {
  const [theme, setTheme] = useTheme();

  const toggleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
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
