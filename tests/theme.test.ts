import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { BrandError, parseBrand } from "../scripts/lib/brand.ts"
import { generateTheme } from "../scripts/lib/generate.ts"
import { ICON_KEYS, ICON_PACKS } from "../scripts/lib/icon-packs.ts"
import {
  CONTRAST_PAIRS,
  checkContrast,
  deriveTokens,
} from "../scripts/lib/tokens.ts"

const root = resolve(import.meta.dirname, "..")

function brand(name: string) {
  const file = join(root, "brands", `${name}.json`)
  return parseBrand(name, file, JSON.parse(readFileSync(file, "utf8")))
}

function runTheme(...args: string[]) {
  return spawnSync(
    process.execPath,
    [
      "--disable-warning=ExperimentalWarning",
      join(root, "scripts/theme.ts"),
      ...args,
    ],
    { cwd: root, encoding: "utf8" }
  )
}

describe("contraste do tema", () => {
  it("o script reprova uma marca de baixo contraste, com o par e a razão", () => {
    const result = runTheme("tests/fixtures/low-contrast.json")
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("primary-foreground")
    expect(result.stderr).toContain("sobre primary")
    expect(result.stderr).toContain("1.32:1")
    expect(result.stderr).toContain("4.5:1")
    expect(result.stderr).toContain("modo light")
  })

  it("não escreve nada quando reprova", () => {
    runTheme("tests/fixtures/low-contrast.json")
    expect(existsSync(join(root, "registry/themes/low-contrast"))).toBe(false)
    expect(existsSync(join(root, "src/themes/low-contrast.css"))).toBe(false)
  })

  it("falha em campo inválido da marca", () => {
    expect(() =>
      parseBrand("x", "x.json", {
        primary: "#4f46e5",
        neutral: "slate",
        fonts: { text: "Inter", heading: "Inter", mono: "JetBrains Mono" },
        radius: "0.5rem",
        density: "huge",
        shadow: "soft",
        icons: "lucide",
      })
    ).toThrow(BrandError)
  })

  for (const name of ["default", "editorial"]) {
    it(`${name}: todo par texto/fundo passa de 4.5:1 nos dois modos`, () => {
      expect(checkContrast(deriveTokens(brand(name)))).toEqual([])
    })
  }

  it("cobre o mínimo exigido de pares", () => {
    const pairs = CONTRAST_PAIRS.map(([fg, bg]) => `${fg}/${bg}`)
    for (const required of [
      "foreground/background",
      "primary-foreground/primary",
      "muted-foreground/background",
      "muted-foreground/muted",
      "destructive/background",
    ]) {
      expect(pairs).toContain(required)
    }
  })
})

describe("item de tema", () => {
  const SHADCN_TOKENS = [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "border",
    "input",
    "ring",
    "chart-1",
    "chart-2",
    "chart-3",
    "chart-4",
    "chart-5",
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
  ]

  for (const name of ["default", "editorial"]) {
    it(`${name}: todos os tokens do shadcn, em OKLCH, claro e escuro`, () => {
      const { files } = generateTheme(brand(name))
      const registry = JSON.parse(
        files.get(`registry/themes/${name}/registry.json`)!
      )
      const item = registry.items[0]
      expect(item.type).toBe("registry:theme")
      for (const mode of ["light", "dark"] as const) {
        for (const token of SHADCN_TOKENS) {
          expect(item.cssVars[mode][token], `${mode} ${token}`).toMatch(
            /^oklch\(/
          )
        }
      }
      expect(item.cssVars.light.radius).toBe(brand(name).radius)
      expect(item.cssVars.theme["font-sans"]).toContain("Variable")
      expect(item.cssVars.theme.spacing).toMatch(/rem$/)
      expect(item.cssVars.theme["shadow-sm"]).toBeTruthy()
    })
  }

  it("os dois temas contrastam em fonte, raio, densidade, sombra e ícone", () => {
    const a = brand("default")
    const b = brand("editorial")
    expect(a.fonts.heading.fallback).not.toBe(b.fonts.heading.fallback)
    expect(a.radius).not.toBe(b.radius)
    expect(a.density).not.toBe(b.density)
    expect(a.shadow).not.toBe(b.shadow)
    expect(a.icons).not.toBe(b.icons)
  })

  it("cada pacote de ícones nomeia todas as chaves semânticas", () => {
    for (const [name, pack] of Object.entries(ICON_PACKS)) {
      for (const key of ICON_KEYS) {
        expect(pack.names[key], `${name}.${key}`).toBeTruthy()
      }
    }
  })
})
