import { loadThemePreference, resolveTheme, readSystemPrefersDark, applyTheme } from "./theme";

export function initThemeBeforeRender(root: HTMLElement = document.documentElement): void {
  const preference = loadThemePreference();
  const resolved = resolveTheme(preference, readSystemPrefersDark());
  applyTheme(resolved, root);
}
