import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  THEME_STORAGE_KEY,
  applyTheme,
  loadThemePreference,
  resolveTheme,
  saveThemePreference
} from "./theme";

describe("theme", () => {
  let root: HTMLElement;

  beforeEach(() => {
    window.localStorage.clear();
    root = document.documentElement;
    delete root.dataset.theme;
  });

  afterEach(() => {
    window.localStorage.clear();
    delete root.dataset.theme;
  });

  it("defaults to system when nothing is saved", () => {
    expect(loadThemePreference()).toBe("system");
  });

  it("persists theme preference in localStorage", () => {
    saveThemePreference("dark");
    expect(loadThemePreference()).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("ignores invalid stored preferences", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(loadThemePreference()).toBe("system");
  });

  it("resolves system preference from prefers-color-scheme", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("applies the resolved theme to the document element", () => {
    applyTheme("dark", root);
    expect(root.dataset.theme).toBe("dark");

    applyTheme("light", root);
    expect(root.dataset.theme).toBe("light");
  });
});
