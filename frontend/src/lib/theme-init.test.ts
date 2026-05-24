import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initThemeBeforeRender } from "./theme-init";
import { saveThemePreference } from "./theme";

describe("initThemeBeforeRender", () => {
  let root: HTMLElement;

  beforeEach(() => {
    window.localStorage.clear();
    root = document.documentElement;
    delete root.dataset.theme;
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  });

  afterEach(() => {
    window.localStorage.clear();
    delete root.dataset.theme;
    vi.unstubAllGlobals();
  });

  it("applies dark theme before React renders when preference is dark", () => {
    saveThemePreference("dark");
    initThemeBeforeRender(root);
    expect(root.dataset.theme).toBe("dark");
  });

  it("uses system preference when stored preference is system", () => {
    saveThemePreference("system");
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    initThemeBeforeRender(root);
    expect(root.dataset.theme).toBe("dark");
  });
});
