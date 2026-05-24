export type ThemePreference = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "ledgerly.theme.v1";

const validPreferences = new Set<ThemePreference>(["light", "dark", "system"]);

export function loadThemePreference(): ThemePreference {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved && validPreferences.has(saved as ThemePreference)) {
    return saved as ThemePreference;
  }

  return "system";
}

export function saveThemePreference(preference: ThemePreference): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }

  return preference;
}

export function applyTheme(theme: ResolvedTheme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
}

export function readSystemPrefersDark(
  mediaQueryList: Pick<MediaQueryList, "matches"> = window.matchMedia("(prefers-color-scheme: dark)")
): boolean {
  return mediaQueryList.matches;
}
