import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook to manage dark/light theme.
 * Persists the preference in localStorage and applies the `.dark` class
 * to `document.documentElement` for Tailwind's class-based dark mode.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then fall back to system preference
    const stored = localStorage.getItem("theme");
    if (stored) {
      return stored === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply the theme class to the document
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return { isDark, toggleTheme };
}