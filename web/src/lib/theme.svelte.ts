export type ThemeMode = "light" | "dark" | "auto";

const STORAGE_KEY = "otomoto-agg:theme";

function readStored(): ThemeMode {
  if (typeof localStorage === "undefined") return "auto";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" ? v : "auto";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function effective(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

function applyToDom(dark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
}

export const theme = (() => {
  let mode = $state<ThemeMode>("auto");
  let effectiveState = $state<"light" | "dark">("light");

  function init() {
    mode = readStored();
    effectiveState = effective(mode);
    applyToDom(effectiveState === "dark");

    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", () => {
        if (mode === "auto") {
          effectiveState = effective(mode);
          applyToDom(effectiveState === "dark");
        }
      });
    }
  }

  function set(next: ThemeMode) {
    mode = next;
    effectiveState = effective(mode);
    applyToDom(effectiveState === "dark");
    if (typeof localStorage !== "undefined") {
      if (mode === "auto") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, mode);
    }
  }

  return {
    get mode() {
      return mode;
    },
    get effective() {
      return effectiveState;
    },
    init,
    set,
  };
})();
