import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { clampRgb, converter, formatHex, parse, wcagContrast } from "culori"
import type { Oklch } from "culori"

const toOklch = converter("oklch")
const toRgb = converter("rgb")

export const RAMP_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const
export type RampStep = (typeof RAMP_STEPS)[number]
export type Ramp = Record<RampStep, Oklch>

// Luminosidade de cada degrau da escala `neutral` do Tailwind v4. Usada para
// montar a escala quando a marca dá uma cor neutra em hex.
const NEUTRAL_LIGHTNESS: Record<RampStep, number> = {
  50: 0.985,
  100: 0.97,
  200: 0.922,
  300: 0.87,
  400: 0.708,
  500: 0.556,
  600: 0.439,
  700: 0.371,
  800: 0.269,
  900: 0.205,
  950: 0.145,
}

export class PaletteError extends Error {}

export function parseColor(value: string, what: string): Oklch {
  const parsed = parse(value)
  const color = parsed ? toOklch(parsed) : undefined
  if (!color) throw new PaletteError(`${what}: "${value}" não é uma cor válida`)
  return { ...color, h: color.h ?? 0 }
}

export function parseHex(value: string, what: string): Oklch {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new PaletteError(
      `${what}: "${value}" não é um hex de 6 dígitos (#rrggbb)`
    )
  }
  return parseColor(value, what)
}

let tailwindScales: Map<string, Ramp> | undefined

/** Lê as escalas de cor do `tailwindcss/theme.css` instalado. */
function loadTailwindScales(): Map<string, Ramp> {
  if (tailwindScales) return tailwindScales
  const require = createRequire(import.meta.url)
  const css = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8")
  const raw = new Map<string, Partial<Record<RampStep, Oklch>>>()
  for (const match of css.matchAll(
    /--color-([a-z]+)-(\d+):\s*(oklch\([^)]*\));/g
  )) {
    const [, scale, step, value] = match
    const color = parseColor(value, `tailwind ${scale}-${step}`)
    const entry = raw.get(scale) ?? {}
    entry[Number(step) as RampStep] = color
    raw.set(scale, entry)
  }
  const scales = new Map<string, Ramp>()
  for (const [scale, entry] of raw) {
    if (RAMP_STEPS.every((step) => entry[step]))
      scales.set(scale, entry as Ramp)
  }
  tailwindScales = scales
  return scales
}

export function neutralRamp(neutral: string): Ramp {
  if (neutral.startsWith("#")) {
    const base = parseHex(neutral, "neutral")
    const chroma = Math.min(base.c, 0.04)
    const ramp = {} as Ramp
    for (const step of RAMP_STEPS) {
      ramp[step] = {
        mode: "oklch",
        l: NEUTRAL_LIGHTNESS[step],
        c: chroma,
        h: base.h,
      }
    }
    return ramp
  }
  const scales = loadTailwindScales()
  const ramp = scales.get(neutral)
  if (!ramp) {
    throw new PaletteError(
      `neutral: "${neutral}" não é hex nem escala do Tailwind (${[...scales.keys()].sort().join(", ")})`
    )
  }
  return ramp
}

export const WHITE: Oklch = { mode: "oklch", l: 1, c: 0, h: 0 }

function round(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)))
}

export function formatOklch(color: Oklch, alpha?: number): string {
  const chroma = color.c < 0.0005 ? 0 : color.c
  const hue = chroma === 0 ? 0 : (color.h ?? 0)
  const base = `${round(color.l, 3)} ${round(chroma, 3)} ${round(hue, 3)}`
  return alpha === undefined
    ? `oklch(${base})`
    : `oklch(${base} / ${round(alpha * 100, 2)}%)`
}

/** Hex da cor como ela aparece na tela (cortada para sRGB). */
export function toHex(color: Oklch): string {
  return formatHex(clampRgb(toRgb(color))) ?? "#??????"
}

export function contrast(foreground: Oklch, background: Oklch): number {
  return wcagContrast(clampRgb(toRgb(foreground)), clampRgb(toRgb(background)))
}

/**
 * `foreground` com opacidade `alpha` por cima de `background`, como o
 * navegador compõe (`bg-destructive/10` sobre a superfície): mistura linear
 * nos canais sRGB, já cortados para o gamut.
 */
export function blend(
  foreground: Oklch,
  background: Oklch,
  alpha: number
): Oklch {
  const top = clampRgb(toRgb(foreground))
  const bottom = clampRgb(toRgb(background))
  const mix = (a: number, b: number) => a * alpha + b * (1 - alpha)
  return toOklch({
    mode: "rgb",
    r: mix(top.r, bottom.r),
    g: mix(top.g, bottom.g),
    b: mix(top.b, bottom.b),
  }) as Oklch
}
