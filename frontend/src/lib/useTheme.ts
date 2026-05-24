import { useEffect, useState } from "react";

import {
  applyTheme,
  loadThemePreference,
  readSystemPrefersDark,
  resolveTheme,
  saveThemePreference,
  type ThemePreference
} from "./theme";

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => loadThemePreference());
  const [prefersDark, setPrefersDark] = useState(() => readSystemPrefersDark());

  const resolved = resolveTheme(preference, prefersDark);

  useEffect(() => {
    saveThemePreference(preference);
  }, [preference]);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setPrefersDark(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return {
    preference,
    setPreference,
    resolved
  };
}
