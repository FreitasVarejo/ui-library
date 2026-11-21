// Gera o item de tema `theme-<nome>` a partir de brands/<nome>.json.
//
//   npm run theme -- brands/<nome>.json [outras marcas]
//   npm run theme:check            (falha se o gerado divergir do versionado)
//
// Sai com código 1, sem escrever nada, se alguma marca tiver par texto/fundo
// abaixo de 4.5:1 ou campo inválido.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { BrandError, parseBrand } from "./lib/brand.ts"
import { ThemeContrastError, generateTheme } from "./lib/generate.ts"
import type { ThemeArtifacts } from "./lib/generate.ts"
import { PaletteError } from "./lib/palette.ts"

const root = resolve(import.meta.dirname, "..")
const rootRegistry = join(root, "registry.json")
const THEME_FRAGMENT = /^registry\/themes\/[^/]+\/registry\.json$/

interface RootRegistry {
  include?: string[]
  [key: string]: unknown
}

function withFragments(
  current: RootRegistry,
  fragments: string[]
): RootRegistry {
  const include = current.include ?? []
  const others = include.filter((path) => !THEME_FRAGMENT.test(path))
  // Fragmentos de temas que já não existem em disco saem do `include`.
  const themes = [
    ...new Set([
      ...include.filter((path) => THEME_FRAGMENT.test(path)),
      ...fragments,
    ]),
  ]
    .filter((path) => fragments.includes(path) || existsSync(join(root, path)))
    .sort()
  return { ...current, include: [...others, ...themes] }
}

function loadBrand(path: string) {
  const file = resolve(path)
  if (!existsSync(file)) throw new BrandError(`${path}: arquivo não encontrado`)
  let data: unknown
  try {
    data = JSON.parse(readFileSync(file, "utf8"))
  } catch (error) {
    throw new BrandError(`${path}: JSON inválido (${(error as Error).message})`)
  }
  return parseBrand(basename(file, ".json"), path, data)
}

function main(argv: string[]): number {
  const check = argv.includes("--check")
  const paths = argv.filter((arg) => !arg.startsWith("--"))
  if (paths.length === 0) {
    console.error("uso: theme.ts [--check] brands/<nome>.json [...]")
    return 2
  }

  // Valida e gera tudo antes de escrever qualquer coisa.
  const generated: ThemeArtifacts[] = []
  let failed = false
  for (const path of paths) {
    try {
      generated.push(generateTheme(loadBrand(path)))
    } catch (error) {
      if (
        error instanceof BrandError ||
        error instanceof PaletteError ||
        error instanceof ThemeContrastError
      ) {
        console.error(`erro: ${error.message}`)
        failed = true
      } else {
        throw error
      }
    }
  }
  if (failed) return 1

  const registry = JSON.parse(
    readFileSync(rootRegistry, "utf8")
  ) as RootRegistry
  const nextRegistry = `${JSON.stringify(
    withFragments(
      registry,
      generated.map((theme) => theme.fragment)
    ),
    null,
    2
  )}\n`

  const outputs = new Map<string, string>()
  for (const theme of generated) {
    for (const [path, content] of theme.files) outputs.set(path, content)
  }
  outputs.set("registry.json", nextRegistry)

  if (check) {
    const stale = [...outputs].filter(([path, content]) => {
      const file = join(root, path)
      return !existsSync(file) || readFileSync(file, "utf8") !== content
    })
    if (stale.length > 0) {
      console.error(
        "gerado diverge do versionado; rode `npm run theme:all` e commite:\n" +
          stale.map(([path]) => `  - ${path}`).join("\n")
      )
      return 1
    }
    console.log(
      `temas em dia: ${generated.map((theme) => theme.item).join(", ")}`
    )
    return 0
  }

  for (const [path, content] of outputs) {
    const file = join(root, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
  }
  for (const theme of generated) {
    console.log(`${theme.item}: contraste ok; ${theme.files.size} arquivos`)
  }
  return 0
}

process.exitCode = main(process.argv.slice(2))
