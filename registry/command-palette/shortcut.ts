/**
 * Atalhos em texto: `"mod+k"`, `"ctrl+shift+p"`. `mod` aceita Ctrl ou Cmd
 * (Ctrl+K e ⌘K). A última parte é a tecla.
 */

interface KeyLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

const ALIASES: Record<string, string> = {
  space: " ",
  esc: "escape",
  cmd: "meta",
  command: "meta",
  control: "ctrl",
  option: "alt",
}

function parse(shortcut: string) {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ALIASES[part] ?? part)
  const key = parts.at(-1) ?? ""
  const mods = new Set(parts.slice(0, -1))
  return { key, mods }
}

export function matchesShortcut(event: KeyLike, shortcut: string): boolean {
  const { key, mods } = parse(shortcut)
  if (key === "" || event.key.toLowerCase() !== key) return false
  const wantsMod = mods.has("mod")
  const ctrl = mods.has("ctrl")
  const meta = mods.has("meta")
  if (wantsMod && !(event.ctrlKey || event.metaKey)) return false
  if (!wantsMod && event.ctrlKey !== ctrl) return false
  if (!wantsMod && event.metaKey !== meta) return false
  return (
    event.shiftKey === mods.has("shift") && event.altKey === mods.has("alt")
  )
}

export function isApplePlatform(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /mac|iphone|ipad/i.test(navigator.userAgent)
  )
}

/** Texto para exibir: `⌘K` no Mac, `Ctrl K` nos demais. */
export function formatShortcut(
  shortcut: string,
  apple: boolean = isApplePlatform()
): string {
  const { key, mods } = parse(shortcut)
  const names = apple
    ? { mod: "⌘", ctrl: "⌃", meta: "⌘", shift: "⇧", alt: "⌥" }
    : { mod: "Ctrl", ctrl: "Ctrl", meta: "Win", shift: "Shift", alt: "Alt" }
  const label = key.length === 1 ? key.toUpperCase() : key
  const parts = [...mods].map((mod) => names[mod as keyof typeof names] ?? mod)
  return apple ? `${parts.join("")}${label}` : [...parts, label].join(" ")
}
