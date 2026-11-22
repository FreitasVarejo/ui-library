import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { clampRgb, converter, parse, wcagContrast } from "culori"
import { describe, expect, it } from "vitest"

import { BrandError, parseBrand } from "../scripts/lib/brand.ts"
import { generateTheme } from "../scripts/lib/generate.ts"
import { ICON_KEYS, ICON_PACKS } from "../scripts/lib/icon-packs.ts"
import { contrast, toHex } from "../scripts/lib/palette.ts"
import {
  CONTRAST_PAIRS,
  checkContrast,
  deriveTokens,
} from "../scripts/lib/tokens.ts"

const root = resolve(import.meta.dirname, "..")
const toRgb = converter("rgb")

function brand(name: string) {
  const file = join(root, "brands", `${name}.json`)
  return parseBrand(name, file, JSON.parse(readFileSync(file, "utf8")))
}

const THEMES = ["default", "editorial"]

function withBrand(name: string, changes: Record<string, unknown>) {
  const file = join(root, "brands", `${name}.json`)
  const data = { ...JSON.parse(readFileSync(file, "utf8")), ...changes }
  return parseBrand(name, file, data)
}

// a marca jiujitsu como marca só escura (#c45322, zinc, texto branco)
function darkOnly() {
  return withBrand("jiujitsu", { scheme: "dark" })
}

function ratio(
  tokens: ReturnType<typeof deriveTokens>,
  mode: "light" | "dark",
  foreground: string,
  background: string
) {
  return contrast(
    tokens[mode][foreground].color,
    tokens[mode][background].color
  )
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

  it("fonte sem versão variável usa @fontsource estático, um import por peso", () => {
    const base = {
      primary: "#4f46e5",
      neutral: "slate",
      fonts: {
        text: "Inter",
        heading: { family: "Barlow Condensed", weights: [600, 700] },
        mono: "JetBrains Mono",
      },
      radius: "0.5rem",
      density: "normal",
      shadow: "soft",
      icons: "lucide",
    }
    const theme = generateTheme(parseBrand("estatica", "estatica.json", base))
    const fragment = theme.files.get("registry/themes/estatica/registry.json")
    const item = JSON.parse(fragment ?? "{}").items[0]
    expect(item.dependencies).toContain("@fontsource/barlow-condensed")
    expect(item.dependencies).not.toContain(
      "@fontsource-variable/barlow-condensed"
    )
    expect(item.cssVars.theme["font-heading"]).toBe(
      "'Barlow Condensed', sans-serif"
    )
    expect(Object.keys(item.css)).toContain(
      '@import "@fontsource/barlow-condensed/700.css"'
    )
    expect(() =>
      parseBrand("x", "x.json", {
        ...base,
        fonts: { ...base.fonts, heading: { family: "A", weights: [] } },
      })
    ).toThrow(BrandError)
  })

  it("fonte fornecida pelo consumidor: item sem import nem dependência, vitrine com import", () => {
    const base = {
      primary: "#4f46e5",
      neutral: "slate",
      fonts: {
        text: "Inter",
        heading: {
          family: "Barlow Condensed",
          weights: [600, 700],
          provided: true,
        },
        mono: "JetBrains Mono",
      },
      radius: "0.5rem",
      density: "normal",
      shadow: "soft",
      icons: "lucide",
    }
    const theme = generateTheme(parseBrand("fornecida", "fornecida.json", base))
    const fragment = theme.files.get("registry/themes/fornecida/registry.json")
    const item = JSON.parse(fragment ?? "{}").items[0]
    expect(item.dependencies.join()).not.toContain("barlow-condensed")
    expect(Object.keys(item.css).join()).not.toContain("barlow-condensed")
    expect(item.cssVars.theme["font-heading"]).toBe(
      "'Barlow Condensed', sans-serif"
    )
    const vitrine = theme.files.get("src/themes/fornecida.css") ?? ""
    expect(vitrine).toContain('@import "@fontsource/barlow-condensed/600.css";')
    expect(vitrine).toContain('@import "@fontsource/barlow-condensed/700.css";')

    const semPesos = generateTheme(
      parseBrand("fornecida", "fornecida.json", {
        ...base,
        fonts: {
          ...base.fonts,
          heading: { family: "Barlow Condensed", provided: true },
        },
      })
    )
    expect(semPesos.files.get("src/themes/fornecida.css")).not.toContain(
      "barlow-condensed"
    )

    expect(() =>
      parseBrand("x", "x.json", {
        ...base,
        fonts: {
          ...base.fonts,
          heading: { family: "A", provided: "sim" },
        },
      })
    ).toThrow(BrandError)
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

  it("o corpo de texto pede 7:1 e os demais pares de texto, 4.5:1", () => {
    const minimum = (fg: string, bg: string) =>
      CONTRAST_PAIRS.find(([f, b]) => f === fg && b === bg)?.[3] ?? 4.5
    expect(minimum("foreground", "background")).toBe(7)
    expect(minimum("card-foreground", "card")).toBe(7)
    expect(minimum("popover-foreground", "popover")).toBe(7)
    expect(minimum("primary-foreground", "primary")).toBe(4.5)
    expect(minimum("muted-foreground", "background")).toBe(4.5)
    expect(minimum("disabled-foreground", "disabled")).toBe(4.5)
    // sem exceção de texto grande: os únicos pares abaixo de 4.5 são os de
    // não-texto (anel, borda de campo e a borda vermelha do destrutivo)
    const lenient = CONTRAST_PAIRS.filter(([, , , min = 4.5]) => min < 4.5)
    for (const [fg, bg, , min] of lenient) {
      expect(min, `${fg}/${bg}`).toBe(3)
      expect(["ring", "input", "destructive"], `${fg}/${bg}`).toContain(fg)
    }
    // o texto de erro segue exigindo 4.5 sobre fundo, cartão e popover
    expect(minimum("destructive", "background")).toBe(4.5)
    expect(minimum("destructive", "card")).toBe(4.5)
    expect(minimum("destructive", "popover")).toBe(4.5)
  })

  it("a borda vermelha do destrutivo pede 3:1 contra fundo, cartão e popover", () => {
    for (const surface of ["background", "card", "popover"]) {
      const pair = CONTRAST_PAIRS.find(
        ([fg, bg, , min]) => fg === "destructive" && bg === surface && min === 3
      )
      expect(pair, `destructive/${surface}`).toBeTruthy()
    }
    for (const name of THEMES) {
      const tokens = deriveTokens(brand(name))
      for (const mode of ["light", "dark"] as const) {
        for (const surface of ["background", "card", "popover"]) {
          expect(
            ratio(tokens, mode, "destructive", surface),
            `${name} ${mode} ${surface}`
          ).toBeGreaterThanOrEqual(3)
        }
      }
    }
    // o portão reprova o que ficar abaixo de 3:1
    const tokens = deriveTokens(brand("default"))
    tokens.dark.destructive = {
      color: { mode: "oklch", l: 0.3, c: 0.2, h: 27 },
      css: "oklch(0.3 0.2 27)",
    }
    const failures = checkContrast(tokens).filter(
      (f) =>
        f.mode === "dark" && f.foreground === "destructive" && f.minimum === 3
    )
    expect(failures.map((f) => f.background).sort()).toEqual([
      "background",
      "card",
      "popover",
    ])
  })

  it("reprova corpo de texto entre 4.5:1 e 7:1", () => {
    const tokens = deriveTokens(brand("default"))
    tokens.light.foreground = {
      color: { mode: "oklch", l: 0.55, c: 0, h: 0 },
      css: "oklch(0.55 0 0)",
    }
    const failures = checkContrast(tokens)
    const failure = failures.find((f) => f.foreground === "foreground")
    expect(failure?.minimum).toBe(7)
    expect(failure?.ratio).toBeGreaterThan(4.5)
    expect(failure?.message).toContain("abaixo de 7:1")
    expect(failures.every((f) => f.foreground === "foreground")).toBe(true)
  })

  it("reprova o anel de foco abaixo de 3:1, com a dica", () => {
    const result = runTheme("tests/fixtures/low-ring.json")
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("ring")
    expect(result.stderr).toContain("3:1")
    expect(result.stderr).toContain("modo light")
    expect(result.stderr).toContain("anel de foco")
    expect(existsSync(join(root, "registry/themes/low-ring"))).toBe(false)
  })

  for (const name of THEMES) {
    describe(name, () => {
      const tokens = deriveTokens(brand(name))

      it("o anel de foco é a primária de cada modo, com 3:1 sobre fundo e cartão", () => {
        for (const mode of ["light", "dark"] as const) {
          expect(tokens[mode].ring.css).toBe(tokens[mode].primary.css)
          expect(tokens[mode]["sidebar-ring"].css).toBe(
            tokens[mode].primary.css
          )
          expect(
            ratio(tokens, mode, "ring", "background")
          ).toBeGreaterThanOrEqual(3)
          expect(ratio(tokens, mode, "ring", "card")).toBeGreaterThanOrEqual(3)
        }
      })

      it("a borda do campo é um tom sólido com 3:1 sobre fundo e cartão", () => {
        for (const mode of ["light", "dark"] as const) {
          expect(tokens[mode].input.css).not.toContain("/")
          expect(
            ratio(tokens, mode, "input", "background")
          ).toBeGreaterThanOrEqual(3)
          expect(ratio(tokens, mode, "input", "card")).toBeGreaterThanOrEqual(3)
        }
      })

      it("o texto sobre a primária tem 4.5:1, sem exceção de texto grande", () => {
        for (const mode of ["light", "dark"] as const) {
          expect(
            ratio(tokens, mode, "primary-foreground", "primary")
          ).toBeGreaterThanOrEqual(4.5)
        }
      })

      it("destrutivo: texto sobre o vermelho cheio e o vermelho sobre o botão suave passam de 4.5:1", () => {
        for (const mode of ["light", "dark"] as const) {
          const alpha = mode === "light" ? 0.1 : 0.2
          expect(
            ratio(tokens, mode, "destructive-foreground", "destructive")
          ).toBeGreaterThanOrEqual(4.5)
          for (const surface of ["background", "popover"]) {
            // medido por fora do gerador: o que o navegador compõe de
            // bg-destructive/10 (claro) ou /20 (escuro) sobre a superfície
            const top = toRgb(parse(tokens[mode].destructive.css))!
            const bottom = toRgb(parse(tokens[mode][surface].css))!
            const mixed = {
              mode: "rgb" as const,
              r: top.r * alpha + bottom.r * (1 - alpha),
              g: top.g * alpha + bottom.g * (1 - alpha),
              b: top.b * alpha + bottom.b * (1 - alpha),
            }
            expect(
              wcagContrast(clampRgb(top), clampRgb(mixed)),
              `${mode} ${surface}`
            ).toBeGreaterThanOrEqual(4.5)
          }
        }
      })

      it("destrutivo suave em hover: a maior mistura (até o teto do shadcn) que passa de 4.5:1", () => {
        for (const mode of ["light", "dark"] as const) {
          const token = tokens[mode]["destructive-soft-hover"]
          const rest = mode === "light" ? 0.1 : 0.2
          const cap = mode === "light" ? 0.2 : 0.3
          expect(token.css).toMatch(/^oklch\(.* \/ \d+%\)$/)
          const alpha = Number(/\/ (\d+)%/.exec(token.css)![1]) / 100
          expect(alpha).toBeGreaterThanOrEqual(rest)
          expect(alpha).toBeLessThanOrEqual(cap)
          const top = toRgb(parse(tokens[mode].destructive.css))!
          const passes = (a: number, surface: string) => {
            const bottom = toRgb(parse(tokens[mode][surface].css))!
            const mixed = {
              mode: "rgb" as const,
              r: top.r * a + bottom.r * (1 - a),
              g: top.g * a + bottom.g * (1 - a),
              b: top.b * a + bottom.b * (1 - a),
            }
            return wcagContrast(clampRgb(top), clampRgb(mixed)) >= 4.5
          }
          for (const surface of ["background", "popover"]) {
            expect(passes(alpha, surface), `${mode} ${surface}`).toBe(true)
          }
          // um ponto percentual a mais já reprova, a menos que seja o teto
          if (alpha < cap) {
            expect(
              ["background", "popover"].every((s) => passes(alpha + 0.01, s))
            ).toBe(false)
          }
        }
      })

      it("desabilitado: texto e fundo por token, com 4.5:1 entre eles", () => {
        for (const mode of ["light", "dark"] as const) {
          expect(
            ratio(tokens, mode, "disabled-foreground", "disabled")
          ).toBeGreaterThanOrEqual(4.5)
        }
      })
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

describe("primary-text: a primária usada como texto", () => {
  const SURFACES = ["background", "card", "popover"]
  const SAMPLES = readdirSync(join(root, "brands"))
    .map((file) => file.replace(/\.json$/, ""))
    .filter((name) => name !== "jiujitsu")

  it("os pares pedem 4.5:1 de texto sobre fundo, cartão e popover", () => {
    for (const surface of SURFACES) {
      const pair = CONTRAST_PAIRS.find(
        ([fg, bg]) => fg === "primary-text" && bg === surface
      )
      expect(pair, `primary-text/${surface}`).toBeTruthy()
      expect(pair![3] ?? 4.5).toBe(4.5)
      expect(pair![2]).toMatch(/primária/)
    }
  })

  for (const name of SAMPLES) {
    it(`${name}: a primária já passa, então o texto sai igual a ela`, () => {
      const tokens = deriveTokens(brand(name))
      for (const mode of ["light", "dark"] as const) {
        expect(tokens[mode]["primary-text"].css, mode).toBe(
          tokens[mode].primary.css
        )
        for (const surface of SURFACES) {
          expect(
            ratio(tokens, mode, "primary-text", surface),
            `${mode} ${surface}`
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    })
  }

  it("a primária que não passa vira um tom só de luminosidade, o mínimo que passa", () => {
    // jiujitsu: #c45322 sobre zinc-900 (cartão) é 3.89:1 e sobre zinc-950 é 4.36:1
    const tokens = deriveTokens(darkOnly())
    const dark = tokens.dark
    expect(toHex(dark.primary.color)).toBe("#c45322")
    expect(ratio(tokens, "dark", "primary", "card")).toBeCloseTo(3.89, 2)
    expect(ratio(tokens, "dark", "primary", "background")).toBeCloseTo(4.36, 2)
    expect(dark["primary-text"].css).not.toBe(dark.primary.css)
    expect(toHex(dark["primary-text"].color)).toBe("#d25f30")
    const { l, c, h } = dark["primary-text"].color
    expect(l).toBeGreaterThan(dark.primary.color.l)
    expect(c).toBe(dark.primary.color.c)
    expect(h).toBe(dark.primary.color.h)
    for (const surface of SURFACES) {
      expect(
        ratio(tokens, "dark", "primary-text", surface),
        surface
      ).toBeGreaterThanOrEqual(4.5)
    }
    // um passo a menos já reprova em alguma superfície
    const below = { ...dark["primary-text"].color, l: l - 0.005 }
    expect(
      SURFACES.every((surface) => contrast(below, dark[surface].color) >= 4.5)
    ).toBe(false)
  })

  it("no claro a derivada escurece", () => {
    const tokens = deriveTokens(withBrand("default", { primary: "#f97316" }))
    const light = tokens.light
    expect(ratio(tokens, "light", "primary", "card")).toBeLessThan(4.5)
    expect(light["primary-text"].color.l).toBeLessThan(light.primary.color.l)
    for (const surface of SURFACES) {
      expect(
        ratio(tokens, "light", "primary-text", surface),
        surface
      ).toBeGreaterThanOrEqual(4.5)
    }
    // o escuro dessa marca já passa: igual à primária
    expect(tokens.dark["primary-text"].css).toBe(tokens.dark.primary.css)
  })

  it("o portão reprova uma marca cuja primária derivada não alcançasse", () => {
    const tokens = deriveTokens(darkOnly())
    tokens.dark["primary-text"] = tokens.dark.primary
    const failures = checkContrast(tokens).filter(
      (f) => f.foreground === "primary-text"
    )
    expect(failures.map((f) => f.background).sort()).toEqual([
      "background",
      "card",
      "popover",
    ])
    expect(failures.every((f) => f.minimum === 4.5)).toBe(true)
    expect(failures[0].message).toContain("a cor primária usada como texto")
  })
})

describe("marca só escura (scheme: dark)", () => {
  it("o padrão é both", () => {
    expect(brand("default").scheme).toBe("both")
    const { scheme, ...semModo } = JSON.parse(
      readFileSync(join(root, "brands/default.json"), "utf8")
    )
    expect(scheme).toBe("both")
    expect(parseBrand("x", "x.json", semModo).scheme).toBe("both")
  })

  it("a marca jiujitsu declara dark", () => {
    expect(brand("jiujitsu").scheme).toBe("dark")
  })

  it("rejeita valor que não é both nem dark", () => {
    expect(() => withBrand("default", { scheme: "light" })).toThrow(BrandError)
    expect(() => withBrand("default", { scheme: "" })).toThrow(BrandError)
  })

  it("os tokens do claro saem iguais aos do escuro, com a primária da marca intacta", () => {
    const tokens = deriveTokens(darkOnly())
    const css = (mode: "light" | "dark") =>
      Object.fromEntries(
        Object.entries(tokens[mode]).map(([key, token]) => [key, token.css])
      )
    expect(css("light")).toEqual(css("dark"))
    expect(toHex(tokens.dark.primary.color)).toBe("#c45322")
    expect(tokens.dark.primary.color.l).toBeLessThan(0.72)
    expect(tokens.dark.ring.css).toBe(tokens.dark.primary.css)
    // o texto sobre a primária é o branco, não o tom mais escuro da escala
    expect(toHex(tokens.dark["primary-foreground"].color)).toBe("#ffffff")
    expect(ratio(tokens, "dark", "primary-foreground", "primary")).toBeCloseTo(
      4.56,
      2
    )
    // fundo e cartão são os do escuro
    expect(toHex(tokens.light.background.color)).toBe(
      toHex(
        deriveTokens(withBrand("jiujitsu", { scheme: "both" })).dark.background
          .color
      )
    )
  })

  it("o item e a vitrine trazem o mesmo conjunto nos dois modos", () => {
    const { files } = generateTheme(darkOnly())
    const item = JSON.parse(
      files.get("registry/themes/jiujitsu/registry.json")!
    ).items[0]
    const { radius, ...light } = item.cssVars.light
    expect(radius).toBe(darkOnly().radius)
    expect(light).toEqual(item.cssVars.dark)
    expect(item.cssVars.dark["primary-text"]).toMatch(/^oklch\(/)
  })

  it("com both a primária do escuro sobe para L 0.72 e o texto sobre ela é escuro", () => {
    const tokens = deriveTokens(withBrand("jiujitsu", { scheme: "both" }))
    expect(tokens.dark.primary.color.l).toBe(0.72)
    expect(tokens.light).not.toBe(tokens.dark)
    expect(tokens.light.primary.css).not.toBe(tokens.dark.primary.css)
  })

  it("o portão vale, e uma vez só: anel de foco sem contraste reprova", () => {
    const dim = withBrand("jiujitsu", { primary: "#5a2a14", scheme: "dark" })
    const failures = checkContrast(deriveTokens(dim)).filter(
      (f) => f.foreground === "ring"
    )
    expect(failures.length).toBeGreaterThan(0)
    expect(failures.every((f) => f.mode === "dark")).toBe(true)
    expect(() => generateTheme(dim)).toThrow(/anel de foco/)
  })

  it("texto sobre a primária sem contraste reprova", () => {
    const pale = withBrand("jiujitsu", { primary: "#f0a070", scheme: "dark" })
    const failures = checkContrast(deriveTokens(pale))
    expect(
      failures.some(
        (f) =>
          f.foreground === "primary-foreground" && f.background === "primary"
      )
    ).toBe(true)
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
    "primary-text",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
    "destructive-soft-hover",
    "disabled",
    "disabled-foreground",
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
      // utilitários text-destructive-foreground, bg-disabled... no consumidor
      expect(item.cssVars.theme["color-destructive-foreground"]).toBe(
        "var(--destructive-foreground)"
      )
      expect(item.cssVars.theme["color-primary-text"]).toBe(
        "var(--primary-text)"
      )
      expect(item.cssVars.theme["color-disabled"]).toBe("var(--disabled)")
      expect(item.cssVars.theme["color-disabled-foreground"]).toBe(
        "var(--disabled-foreground)"
      )
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

describe("alvo de toque da marca", () => {
  it("o padrão é compact e os dois temas do repo o declaram", () => {
    for (const name of THEMES) {
      const raw = JSON.parse(
        readFileSync(join(root, "brands", `${name}.json`), "utf8")
      )
      expect(raw.target).toBe("compact")
      expect(brand(name).target).toBe("compact")
    }
    const { target, ...semAlvo } = JSON.parse(
      readFileSync(join(root, "brands/default.json"), "utf8")
    )
    expect(target).toBe("compact")
    expect(parseBrand("x", "x.json", semAlvo).target).toBe("compact")
  })

  it("rejeita valor que não é compact, comfortable ou touch", () => {
    expect(() => withBrand("default", { target: "huge" })).toThrow(BrandError)
    expect(() => withBrand("default", { target: "" })).toThrow(BrandError)
  })

  function themeCss(name: string, target: string) {
    const { files } = generateTheme(withBrand(name, { target }))
    const registry = JSON.parse(
      files.get(`registry/themes/${name}/registry.json`)!
    )
    return {
      css: registry.items[0].css as Record<string, Record<string, string>>,
      vitrine: files.get(`src/themes/${name}.css`)!,
    }
  }

  it("compact emite os mesmos seletores do alvo com revert-layer, sem px", () => {
    const compact = themeCss("default", "compact")
    const touch = themeCss("default", "touch")
    const reverted = Object.entries(compact.css).filter(
      ([, declarations]) =>
        declarations["min-height"] === "revert-layer" ||
        declarations["min-width"] === "revert-layer"
    )
    expect(reverted.length).toBeGreaterThan(0)
    // todo seletor de alvo do touch existe no compact: o CLI do shadcn só
    // substitui regra de mesmo seletor, então trocar de marca desfaz o touch
    const sized = Object.entries(touch.css).filter(([, declarations]) =>
      ["min-height", "min-width", "inset", "height"].some((property) =>
        /px|auto/.test(declarations[property] ?? "")
      )
    )
    for (const [selector] of sized) {
      expect(Object.keys(compact.css), selector).toContain(selector)
    }
    expect(JSON.stringify(compact.css)).not.toContain("44px")
    expect(JSON.stringify(compact.css)).not.toContain("56px")
    expect(compact.vitrine).toContain("min-height: revert-layer;")
    // o textarea volta ao min-h-16 do shadcn em vez de zerar
    expect(compact.css['[data-slot="textarea"]']["min-height"]).toBe(
      "revert-layer"
    )
  })

  it("rótulo ao lado do checkbox desabilitado do Base UI (span com data-disabled)", () => {
    const { css } = themeCss("default", "compact")
    expect(JSON.stringify(Object.keys(css))).toContain(
      '.peer:is(:disabled, [data-disabled]:not([data-disabled=\\"false\\"]), [aria-disabled=\\"true\\"]) ~ [data-slot=\\"label\\"]'
    )
  })

  for (const [target, size] of [
    ["comfortable", "44px"],
    ["touch", "56px"],
  ] as const) {
    it(`${target}: ${size} de altura mínima nos controles, ícone quadrado`, () => {
      const { css, vitrine } = themeCss("default", target)
      const heights = Object.entries(css).filter(
        ([, declarations]) => declarations["min-height"] === size
      )
      const selectors = heights.map(([selector]) => selector).join(", ")
      for (const slot of ["input", "select-trigger", "toggle"]) {
        expect(selectors).toContain(`[data-slot="${slot}"]`)
      }
      expect(selectors).toContain('[data-slot][class~="group/button"]')
      expect(JSON.stringify(css)).toContain(
        `max(${size}, calc(var(--spacing) * 16))`
      )
      const square = Object.entries(css).find(
        ([, declarations]) => declarations["min-width"] === size
      )
      expect(square?.[0]).toContain('[class~="size-8"]')
      expect(vitrine).toContain(`min-height: ${size};`)
    })
  }
})

describe("CSS do tema sobre os componentes do shadcn", () => {
  for (const name of THEMES) {
    const { files } = generateTheme(brand(name))
    const registry = JSON.parse(
      files.get(`registry/themes/${name}/registry.json`)!
    )
    const css = registry.items[0].css as Record<string, Record<string, string>>
    const vitrine = files.get(`src/themes/${name}.css`)!

    it(`${name}: foco sólido de 2px na cor --ring, sem o halo`, () => {
      expect(css["[data-slot]:focus-visible"]).toEqual({
        outline: "2px solid var(--ring)",
        "outline-offset": "2px",
        "--tw-ring-shadow": "0 0 #0000",
      })
    })

    it(`${name}: hover do destrutivo suave: fundo e borda por token, só onde há hover`, () => {
      const selector = '[data-slot][class~="bg-destructive/10"]:hover'
      // dentro de @media (hover: hover), como o `hover:` do Tailwind v4
      expect(css[selector]).toBeUndefined()
      expect(
        (css["@media (hover: hover)"] as unknown as Record<string, unknown>)[
          selector
        ]
      ).toEqual({
        "background-color": "var(--destructive-soft-hover)",
        "border-color": "var(--destructive)",
      })
      expect(vitrine).toContain("@media (hover: hover) {")
      expect(vitrine).toContain(
        `  html[data-brand="${name}"] ${selector} {\n    background-color: var(--destructive-soft-hover);\n    border-color: var(--destructive);\n  }`
      )
    })

    it(`${name}: texto na cor da primária usa --primary-text, por data-slot`, () => {
      const [selector, declarations] = Object.entries(css).find(
        ([, rule]) => rule.color === "var(--primary-text)"
      )!
      expect(declarations).toEqual({ color: "var(--primary-text)" })
      // botão de variante link (`text-primary`), sem casar `bg-primary` nem
      // `text-primary-foreground`
      expect(selector).toContain(
        '[data-slot][class~="group/button"][class~="text-primary"]'
      )
      expect(selector).toContain('[data-slot="badge"][class~="text-primary"]')
      expect(selector).toContain('[data-slot="field-description"] > a:hover')
      expect(selector).toContain('[data-slot="empty-description"] > a:hover')
      expect(vitrine).toContain(
        `html[data-brand="${name}"] [data-slot][class~="group/button"][class~="text-primary"],`
      )
      expect(vitrine).toContain("  color: var(--primary-text);")
    })

    it(`${name}: desabilitado sem opacidade, por par de token`, () => {
      const opacity = Object.entries(css).find(
        ([, declarations]) => declarations.opacity === "1"
      )
      expect(opacity?.[0]).toContain("[data-slot]")
      expect(opacity?.[0]).toContain(":disabled")
      expect(opacity?.[0]).toContain("[data-disabled]")
      expect(opacity?.[0]).toContain('[aria-disabled="true"]')
      expect(opacity?.[0]).toContain("breadcrumb-page")
      const filled = Object.entries(css).find(
        ([selector, declarations]) =>
          selector.includes('[class~="bg-primary"]') &&
          declarations["background-color"] === "var(--disabled)"
      )
      expect(filled).toBeTruthy()
      const text = Object.entries(css).find(
        ([selector, declarations]) =>
          selector.startsWith('[data-slot][class~="group/button"]:is(') &&
          declarations.color === "var(--disabled-foreground)"
      )
      expect(text).toBeTruthy()
    })

    it(`${name}: a vitrine recebe as mesmas regras presas à marca`, () => {
      expect(vitrine).toContain(
        `html[data-brand="${name}"] [data-slot]:focus-visible {`
      )
      expect(vitrine).toContain("--tw-ring-shadow: 0 0 #0000;")
      expect(vitrine).toContain("var(--disabled-foreground)")
      for (const block of vitrine.split("\n\n")) {
        if (block.includes("{") && block.includes("--tw-ring-shadow")) {
          expect(block.startsWith(`html[data-brand="${name}"]`)).toBe(true)
        }
      }
    })
  }
})

describe("texto na cor da primária nos arquivos", () => {
  function sources(dir: string): string[] {
    return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(
      (entry) => {
        const path = join(dir, entry.name)
        if (entry.isDirectory())
          return entry.name === "themes" ? [] : sources(path)
        return /\.tsx?$/.test(entry.name) ? [path] : []
      }
    )
  }
  // `text-primary` como classe inteira (com variantes na frente), não
  // `text-primary-foreground` nem `text-primary-text`
  const BARE = /(?<![\w-])(?:[^\s"'`]*:)?text-primary(?![\w-])/

  it("só os componentes do shadcn que o tema cobre usam text-primary", () => {
    const found = sources("src/components/ui")
      .filter((file) => BARE.test(readFileSync(join(root, file), "utf8")))
      .map((file) => file.split("/").pop())
      .sort()
    // button e badge (variante link), field e empty (link da descrição, em
    // hover): cada um tem regra por data-slot em scripts/lib/css.ts
    expect(found).toEqual(["badge.tsx", "button.tsx", "empty.tsx", "field.tsx"])
  })

  it("os blocos do registry usam text-primary-text", () => {
    for (const file of sources("registry")) {
      expect(BARE.test(readFileSync(join(root, file), "utf8")), file).toBe(
        false
      )
    }
  })
})
