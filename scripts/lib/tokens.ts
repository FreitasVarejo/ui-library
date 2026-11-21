import type { Oklch } from "culori"
import type { Brand, Density, Shadow } from "./brand.ts"
import {
  WHITE,
  contrast,
  formatOklch,
  neutralRamp,
  parseHex,
  toHex,
} from "./palette.ts"

export type Mode = "light" | "dark"

/** Um token resolvido: a cor para o contraste e o texto CSS para o tema. */
interface Token {
  color: Oklch
  css: string
}

export type ModeTokens = Record<string, Token>

function solid(color: Oklch): Token {
  return { color, css: formatOklch(color) }
}

function translucent(color: Oklch, alpha: number): Token {
  return { color, css: formatOklch(color, alpha) }
}

function lightness(color: Oklch, l: number): Oklch {
  return { ...color, l }
}

function hue(color: Oklch, h: number, l: number, c: number): Oklch {
  return { mode: "oklch", l, c, h: (color.h ?? 0) + h }
}

export function deriveTokens(brand: Brand): Record<Mode, ModeTokens> {
  const ramp = neutralRamp(brand.neutral)
  const primary = parseHex(brand.primary, "primary")
  const charts = [0, 55, 110, 200, 300]

  const lightPrimary = primary
  const darkPrimary = lightness(primary, Math.max(primary.l, 0.72))
  // Claro: texto branco sobre a primária, salvo `primaryForeground` na marca.
  // Escuro: a primária sobe para L >= 0.72 e o texto é o tom mais escuro.
  const lightPrimaryFg = brand.primaryForeground
    ? parseHex(brand.primaryForeground, "primaryForeground")
    : WHITE
  const darkPrimaryFg = ramp[950]

  const light: ModeTokens = {
    background: solid(ramp[50]),
    foreground: solid(ramp[950]),
    card: solid(WHITE),
    "card-foreground": solid(ramp[950]),
    popover: solid(WHITE),
    "popover-foreground": solid(ramp[950]),
    primary: solid(lightPrimary),
    "primary-foreground": solid(lightPrimaryFg),
    secondary: solid(ramp[100]),
    "secondary-foreground": solid(ramp[900]),
    muted: solid(ramp[100]),
    "muted-foreground": solid(ramp[600]),
    accent: solid(ramp[100]),
    "accent-foreground": solid(ramp[900]),
    destructive: solid({ mode: "oklch", l: 0.55, c: 0.22, h: 27 }),
    border: solid(ramp[200]),
    input: solid(ramp[200]),
    ring: solid(ramp[400]),
    sidebar: solid(ramp[100]),
    "sidebar-foreground": solid(ramp[900]),
    "sidebar-primary": solid(lightPrimary),
    "sidebar-primary-foreground": solid(lightPrimaryFg),
    "sidebar-accent": solid(ramp[200]),
    "sidebar-accent-foreground": solid(ramp[900]),
    "sidebar-border": solid(ramp[200]),
    "sidebar-ring": solid(ramp[400]),
  }
  const dark: ModeTokens = {
    background: solid(ramp[950]),
    foreground: solid(ramp[50]),
    card: solid(ramp[900]),
    "card-foreground": solid(ramp[50]),
    popover: solid(ramp[900]),
    "popover-foreground": solid(ramp[50]),
    primary: solid(darkPrimary),
    "primary-foreground": solid(darkPrimaryFg),
    secondary: solid(ramp[800]),
    "secondary-foreground": solid(ramp[50]),
    muted: solid(ramp[800]),
    "muted-foreground": solid(ramp[400]),
    accent: solid(ramp[800]),
    "accent-foreground": solid(ramp[50]),
    destructive: solid({ mode: "oklch", l: 0.704, c: 0.191, h: 22.216 }),
    border: translucent(WHITE, 0.1),
    input: translucent(WHITE, 0.15),
    ring: solid(ramp[500]),
    sidebar: solid(ramp[900]),
    "sidebar-foreground": solid(ramp[50]),
    "sidebar-primary": solid(darkPrimary),
    "sidebar-primary-foreground": solid(darkPrimaryFg),
    "sidebar-accent": solid(ramp[800]),
    "sidebar-accent-foreground": solid(ramp[50]),
    "sidebar-border": translucent(WHITE, 0.1),
    "sidebar-ring": solid(ramp[500]),
  }
  charts.forEach((offset, index) => {
    const key = `chart-${index + 1}`
    light[key] = solid(hue(primary, offset, 0.62, 0.14))
    dark[key] = solid(hue(primary, offset, 0.72, 0.14))
  })
  return { light, dark }
}

// Pares texto/fundo que a marca precisa manter acima de 4.5:1 nos dois modos.
// Os cinco primeiros são o mínimo exigido; os demais são os pares que os
// componentes do shadcn de fato desenham.
export const CONTRAST_PAIRS: ReadonlyArray<
  readonly [foreground: string, background: string, hint: string]
> = [
  ["foreground", "background", "texto principal sobre o fundo da página"],
  [
    "primary-foreground",
    "primary",
    "o texto sobre a cor primária não é legível; escureça a primária ou defina `primaryForeground` na marca",
  ],
  [
    "muted-foreground",
    "background",
    "texto secundário sobre o fundo da página; use uma neutra com mais contraste",
  ],
  [
    "muted-foreground",
    "muted",
    "texto secundário sobre áreas apagadas; use uma neutra com mais contraste",
  ],
  [
    "destructive",
    "background",
    "texto de erro sobre o fundo da página; o vermelho de ação destrutiva precisa de mais contraste",
  ],
  ["card-foreground", "card", "texto sobre cartões"],
  ["popover-foreground", "popover", "texto sobre popovers e menus"],
  ["secondary-foreground", "secondary", "texto sobre superfícies secundárias"],
  ["accent-foreground", "accent", "texto sobre itens em foco ou hover"],
  ["sidebar-foreground", "sidebar", "texto da barra lateral"],
  [
    "sidebar-primary-foreground",
    "sidebar-primary",
    "texto sobre o destaque da barra lateral",
  ],
  [
    "sidebar-accent-foreground",
    "sidebar-accent",
    "texto do item ativo ou em hover da barra lateral",
  ],
  ["destructive", "card", "texto de erro sobre cartões"],
  ["muted-foreground", "card", "texto secundário sobre cartões"],
]

export const MIN_CONTRAST = 4.5

export interface ContrastFailure {
  mode: Mode
  foreground: string
  background: string
  ratio: number
  message: string
}

export function checkContrast(
  tokens: Record<Mode, ModeTokens>
): ContrastFailure[] {
  const failures: ContrastFailure[] = []
  for (const mode of ["light", "dark"] as const) {
    for (const [fg, bg, hint] of CONTRAST_PAIRS) {
      const fgToken = tokens[mode][fg]
      const bgToken = tokens[mode][bg]
      const ratio = contrast(fgToken.color, bgToken.color)
      if (ratio < MIN_CONTRAST) {
        failures.push({
          mode,
          foreground: fg,
          background: bg,
          ratio,
          message:
            `modo ${mode}: ${fg} (${toHex(fgToken.color)}) sobre ${bg} ` +
            `(${toHex(bgToken.color)}) tem contraste ${ratio.toFixed(2)}:1, ` +
            `abaixo de ${MIN_CONTRAST}:1 — ${hint}`,
        })
      }
    }
  }
  return failures
}

const DENSITY_SPACING: Record<Density, string> = {
  compact: "0.22rem",
  normal: "0.25rem",
  airy: "0.28rem",
}

export function spacingFor(density: Density): string {
  return DENSITY_SPACING[density]
}

const SHADOW_NONE = "0 0 #0000"

// Sombras em duas camadas, como a escala do Tailwind, com a opacidade
// multiplicada em `strong`.
function shadowScale(strength: number): Record<string, string> {
  const a = (value: number) =>
    `oklch(0 0 0 / ${Number((value * strength).toFixed(3))})`
  return {
    "2xs": `0 1px 1px 0 ${a(0.04)}`,
    xs: `0 1px 2px 0 ${a(0.05)}`,
    sm: `0 1px 3px 0 ${a(0.08)}, 0 1px 2px -1px ${a(0.06)}`,
    md: `0 4px 8px -2px ${a(0.08)}, 0 2px 4px -2px ${a(0.06)}`,
    lg: `0 10px 16px -4px ${a(0.1)}, 0 4px 6px -4px ${a(0.06)}`,
    xl: `0 20px 24px -6px ${a(0.1)}, 0 8px 8px -6px ${a(0.05)}`,
    "2xl": `0 24px 48px -12px ${a(0.2)}`,
  }
}

/** Valores de `--shadow-<tamanho>` para o nível de sombra da marca. */
export function shadowsFor(shadow: Shadow): Record<string, string> {
  if (shadow === "none") {
    return Object.fromEntries(
      Object.keys(shadowScale(1)).map((size) => [size, SHADOW_NONE])
    )
  }
  return shadowScale(shadow === "strong" ? 2.5 : 1)
}

export function cssValues(tokens: ModeTokens): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tokens).map(([name, token]) => [name, token.css])
  )
}
