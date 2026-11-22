import { isIconPackName } from "./icon-packs.ts"
import type { IconPackName } from "./icon-packs.ts"

export const DENSITIES = ["compact", "normal", "airy"] as const
export const SHADOWS = ["none", "soft", "strong"] as const
export const TARGETS = ["compact", "comfortable", "touch"] as const
export type Density = (typeof DENSITIES)[number]
export type Shadow = (typeof SHADOWS)[number]
export type Target = (typeof TARGETS)[number]
export type Fallback = "sans-serif" | "serif" | "monospace"

export interface BrandFont {
  /** nome do Google Fonts, ex.: "Source Sans 3" */
  family: string
  fallback: Fallback
  /**
   * pesos de uma fonte sem versão variável: usa `@fontsource/<família>` estático
   * (um import por peso) em vez de `@fontsource-variable/<família>`
   */
  weights?: number[]
  /**
   * fonte fornecida pelo consumidor: o item `registry:theme` declara só o nome
   * da família (sem `@import` nem dependência, e sem o sufixo " Variable" na
   * pilha) e quem consome traz o `@font-face`. Na vitrine, com `weights`
   * importa o `@fontsource/<família>` estático só em `src/themes/<marca>.css`,
   * para mostrar a fonte de verdade; sem `weights`, a vitrine fica no fallback.
   */
  provided?: boolean
}

export interface Brand {
  name: string
  primary: string
  /** texto sobre a primária no modo claro; padrão: branco */
  primaryForeground?: string
  neutral: string
  fonts: { text: BrandFont; heading: BrandFont; mono: BrandFont }
  radius: string
  density: Density
  shadow: Shadow
  /**
   * alvo mínimo de toque dos controles: `compact` deixa o tamanho do shadcn
   * (32px), `comfortable` 44px, `touch` 56px; padrão: `compact`
   */
  target: Target
  icons: IconPackName
}

export class BrandError extends Error {}

const FALLBACKS: Fallback[] = ["sans-serif", "serif", "monospace"]

function fail(file: string, message: string): never {
  throw new BrandError(`${file}: ${message}`)
}

function str(file: string, data: Record<string, unknown>, key: string): string {
  const value = data[key]
  if (typeof value !== "string" || value.trim() === "") {
    fail(file, `campo "${key}" ausente ou vazio`)
  }
  return value
}

function oneOf<T extends string>(
  file: string,
  data: Record<string, unknown>,
  key: string,
  allowed: readonly T[]
): T {
  const value = str(file, data, key)
  if (!allowed.includes(value as T)) {
    fail(
      file,
      `"${key}" deve ser um de ${allowed.join(", ")} (veio "${value}")`
    )
  }
  return value as T
}

function font(
  file: string,
  fonts: Record<string, unknown>,
  key: string,
  defaultFallback: Fallback
): BrandFont {
  const raw = fonts[key]
  if (typeof raw === "string" && raw.trim() !== "") {
    return { family: raw.trim(), fallback: defaultFallback }
  }
  if (raw && typeof raw === "object") {
    const entry = raw as Record<string, unknown>
    const family = entry.family
    const fallback = entry.fallback ?? defaultFallback
    if (typeof family !== "string" || family.trim() === "") {
      fail(file, `fonts.${key}.family ausente`)
    }
    if (!FALLBACKS.includes(fallback as Fallback)) {
      fail(file, `fonts.${key}.fallback deve ser um de ${FALLBACKS.join(", ")}`)
    }
    const weights = entry.weights
    if (
      weights !== undefined &&
      (!Array.isArray(weights) ||
        weights.length === 0 ||
        !weights.every(
          (weight) => Number.isInteger(weight) && weight >= 100 && weight <= 900
        ))
    ) {
      fail(
        file,
        `fonts.${key}.weights deve ser uma lista de pesos de 100 a 900`
      )
    }
    const provided = entry.provided
    if (provided !== undefined && typeof provided !== "boolean") {
      fail(file, `fonts.${key}.provided deve ser true ou false`)
    }
    return {
      family: family.trim(),
      fallback: fallback as Fallback,
      ...(weights === undefined ? {} : { weights: weights as number[] }),
      ...(provided === undefined ? {} : { provided }),
    }
  }
  return fail(file, `campo "fonts.${key}" ausente`)
}

/** Valida o JSON de uma marca. `file` entra nas mensagens de erro. */
export function parseBrand(name: string, file: string, data: unknown): Brand {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail(file, "esperava um objeto JSON")
  }
  const raw = data as Record<string, unknown>
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    fail(file, `nome "${name}" deve ser minúsculo, com letras, dígitos e hífen`)
  }
  const fonts = raw.fonts
  if (!fonts || typeof fonts !== "object") fail(file, `campo "fonts" ausente`)
  const fontData = fonts as Record<string, unknown>
  const icons = str(file, raw, "icons")
  if (!isIconPackName(icons)) {
    fail(
      file,
      `"icons" deve ser um de lucide, phosphor, tabler (veio "${icons}")`
    )
  }
  const radius = str(file, raw, "radius")
  if (!/^\d+(\.\d+)?(rem|px)$/.test(radius)) {
    fail(
      file,
      `"radius" deve ser um valor em rem ou px, ex.: "0.5rem" ou "0rem"`
    )
  }
  return {
    name,
    primary: str(file, raw, "primary"),
    primaryForeground:
      raw.primaryForeground === undefined
        ? undefined
        : str(file, raw, "primaryForeground"),
    neutral: str(file, raw, "neutral"),
    fonts: {
      text: font(file, fontData, "text", "sans-serif"),
      heading: font(file, fontData, "heading", "sans-serif"),
      mono: font(file, fontData, "mono", "monospace"),
    },
    radius,
    density: oneOf(file, raw, "density", DENSITIES),
    shadow: oneOf(file, raw, "shadow", SHADOWS),
    target:
      raw.target === undefined
        ? "compact"
        : oneOf(file, raw, "target", TARGETS),
    icons,
  }
}
