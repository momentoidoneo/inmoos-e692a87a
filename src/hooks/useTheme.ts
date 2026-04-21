import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("inmoos-theme") as Theme) ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("inmoos-theme", theme);
  }, [theme]);

  return { theme, setTheme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) };
}
