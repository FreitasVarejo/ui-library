import type { Brand, BrandFont } from "./brand.ts"
import { cssField, themeRules, vitrineCss } from "./css.ts"
import { ICON_PACKS, renderIconsFile } from "./icon-packs.ts"
import {
  checkContrast,
  cssValues,
  deriveTokens,
  shadowsFor,
  spacingFor,
} from "./tokens.ts"
import type { ContrastFailure } from "./tokens.ts"

export class ThemeContrastError extends Error {
  failures: ContrastFailure[]
  constructor(brand: string, failures: ContrastFailure[]) {
    super(
      `marca "${brand}" reprovada na checagem de contraste:\n` +
        failures.map((failure) => `  - ${failure.message}`).join("\n")
    )
    this.failures = failures
  }
}

function slug(family: string): string {
  return family.toLowerCase().replace(/\s+/g, "-")
}

/**
 * Pacote @fontsource de uma família do Google Fonts: o variável, ou o estático
 * quando a marca lista `weights` (famílias sem versão variável).
 */
export function fontPackage(font: BrandFont): string {
  return font.weights
    ? `@fontsource/${slug(font.family)}`
    : `@fontsource-variable/${slug(font.family)}`
}

/** Especificadores de `@import` de uma fonte: um por peso no estático. */
export function fontImports(font: BrandFont): string[] {
  const pkg = fontPackage(font)
  return font.weights
    ? font.weights.map((weight) => `${pkg}/${weight}.css`)
    : [pkg]
}

/**
 * Nome da família na pilha: o do pacote estático e o da fonte fornecida pelo
 * consumidor valem como estão; o variável do @fontsource leva " Variable".
 */
export function fontStack(font: BrandFont): string {
  const family =
    font.weights || font.provided ? font.family : `${font.family} Variable`
  return `'${family}', ${font.fallback}`
}

function uniqueFonts(brand: Brand): BrandFont[] {
  const seen = new Map<string, BrandFont>()
  for (const font of [
    brand.fonts.text,
    brand.fonts.heading,
    brand.fonts.mono,
  ]) {
    seen.set(font.family, font)
  }
  return [...seen.values()]
}

export interface ThemeArtifacts {
  /** caminho relativo à raiz do repo -> conteúdo */
  files: Map<string, string>
  /** nome do item no registry */
  item: string
  /** caminho do registry.json de fragmento, para o `include` da raiz */
  fragment: string
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function cssBlock(selector: string, values: Record<string, string>): string {
  const lines = Object.entries(values).map(
    ([key, value]) => `  --${key}: ${value};`
  )
  return `${selector} {\n${lines.join("\n")}\n}\n`
}

/**
 * Gera tudo o que uma marca produz. Lança `ThemeContrastError` antes de
 * devolver qualquer arquivo se algum par ficar abaixo do mínimo dele (4.5:1
 * de texto, 7:1 de corpo, 3:1 de anel de foco e borda de campo).
 */
export function generateTheme(brand: Brand): ThemeArtifacts {
  const tokens = deriveTokens(brand)
  const failures = checkContrast(tokens)
  if (failures.length > 0) throw new ThemeContrastError(brand.name, failures)

  const light = cssValues(tokens.light)
  const dark = cssValues(tokens.dark)
  const shadows = Object.fromEntries(
    Object.entries(shadowsFor(brand.shadow)).map(([size, value]) => [
      `shadow-${size}`,
      value,
    ])
  )
  const fonts = {
    "font-sans": fontStack(brand.fonts.text),
    "font-heading": fontStack(brand.fonts.heading),
    "font-mono": fontStack(brand.fonts.mono),
  }
  const spacing = spacingFor(brand.density)
  const pack = ICON_PACKS[brand.icons]
  const fontList = uniqueFonts(brand)
  const rules = themeRules(brand)
  // Utilitários de cor dos tokens que o shadcn não conhece. O CLI do shadcn
  // resolve `--color-*` dos tokens novos sozinho, mas só se o valor for uma
  // cor reconhecida; escrito aqui, o mapeamento não depende disso.
  const colors = Object.fromEntries(
    [
      "destructive-foreground",
      "disabled",
      "disabled-foreground",
      "primary-text",
    ].map((name) => [`color-${name}`, `var(--${name})`])
  )

  const item = {
    name: `theme-${brand.name}`,
    type: "registry:theme",
    title: `Tema ${brand.name}`,
    description:
      `Identidade visual "${brand.name}": cores em OKLCH (claro e escuro), ` +
      `fontes, raio, densidade, sombra e ícones (${brand.icons}). ` +
      `Instale por cima de outro tema com --overwrite para trocar a identidade.`,
    dependencies: [
      ...new Set([
        ...fontList.filter((font) => !font.provided).map(fontPackage),
        pack.dependency,
      ]),
    ].sort(),
    files: [
      {
        path: "icons.ts",
        type: "registry:lib",
        target: "@lib/icons.ts",
      },
    ],
    cssVars: {
      theme: { ...fonts, spacing, ...shadows, ...colors },
      light: { ...light, radius: brand.radius },
      dark,
    },
    css: {
      ...Object.fromEntries(
        fontList
          .filter((font) => !font.provided)
          .flatMap(fontImports)
          .map((spec) => [`@import "${spec}"`, {}])
      ),
      ...cssField(rules),
    },
    docs:
      `Tema ${brand.name} aplicado. Os blocos importam ícones de @/lib/icons ` +
      `(pacote ${brand.icons}); para trocar de identidade, instale outro ` +
      `theme-<nome> com --overwrite.`,
  }

  const fragment = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    items: [item],
  }

  const vitrine = [
    `/* Gerado por scripts/theme.ts a partir de brands/${brand.name}.json. Não edite. */`,
    ...fontList
      .filter((font) => !font.provided || font.weights)
      .flatMap(fontImports)
      .map((spec) => `@import "${spec}";`),
    ``,
    cssBlock(`html[data-brand="${brand.name}"]`, {
      ...fonts,
      spacing,
      ...Object.fromEntries(
        Object.entries(shadows).map(([key, value]) => [`brand-${key}`, value])
      ),
      ...light,
      radius: brand.radius,
    }),
    cssBlock(`html[data-brand="${brand.name}"].dark`, dark),
    vitrineCss(brand, rules),
  ].join("\n")

  const base = `registry/themes/${brand.name}`
  const files = new Map<string, string>([
    [`${base}/registry.json`, json(fragment)],
    [`${base}/icons.ts`, renderIconsFile(brand.icons)],
    [`src/themes/${brand.name}.css`, vitrine],
  ])
  return { files, item: item.name, fragment: `${base}/registry.json` }
}
