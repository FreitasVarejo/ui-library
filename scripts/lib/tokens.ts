import type { Oklch } from "culori"
import type { Brand, Density, Shadow } from "./brand.ts"
import {
  RAMP_STEPS,
  WHITE,
  blend,
  contrast,
  formatOklch,
  neutralRamp,
  parseHex,
  toHex,
} from "./palette.ts"
import type { Ramp } from "./palette.ts"

export type Mode = "light" | "dark"
const MODES = ["light", "dark"] as const

/** Um token resolvido: a cor para o contraste e o texto CSS para o tema. */
interface Token {
  color: Oklch
  css: string
  /** opacidade do token, quando `css` é a cor com alfa (`translucent`) */
  alpha?: number
}

export type ModeTokens = Record<string, Token>

function solid(color: Oklch): Token {
  return { color, css: formatOklch(color) }
}

function translucent(color: Oklch, alpha: number): Token {
  return { color, css: formatOklch(color, alpha), alpha }
}

function lightness(color: Oklch, l: number): Oklch {
  return { ...color, l }
}

function hue(color: Oklch, h: number, l: number, c: number): Oklch {
  return { mode: "oklch", l, c, h: (color.h ?? 0) + h }
}

// Opacidade do fundo do botão suave do shadcn (`bg-destructive/10` no claro,
// `dark:bg-destructive/20` no escuro; veja `ui/button.tsx`).
const SOFT_ALPHA: Record<Mode, number> = { light: 0.1, dark: 0.2 }
// Hover do mesmo botão (`hover:bg-destructive/20`, `dark:hover:bg-destructive/30`):
// é o teto; o tema usa a maior mistura até ele que ainda passa 4.5:1.
const SOFT_HOVER_ALPHA: Record<Mode, number> = { light: 0.2, dark: 0.3 }

// Contrastes mínimos do portão.
const TEXT = 4.5
const BODY = 7
const NON_TEXT = 3

/**
 * `--input`: o tom da escala neutra mais próximo da superfície que ainda
 * alcança 3:1 contra o fundo da página e contra o cartão. No claro isso é o
 * tom mais claro que passa; no escuro, o mais escuro que passa. Sem tom que
 * sirva, devolve o extremo (o portão reprova com a dica).
 */
function inputTone(ramp: Ramp, mode: Mode, surfaces: Oklch[]): Oklch {
  const steps = mode === "light" ? RAMP_STEPS : [...RAMP_STEPS].reverse()
  const found = steps.find((step) =>
    surfaces.every((surface) => contrast(ramp[step], surface) >= NON_TEXT)
  )
  return ramp[found ?? steps[steps.length - 1]]
}

/**
 * `--destructive`: parte do vermelho de base e anda a luminosidade (mais
 * escuro no claro, mais claro no escuro) até o texto vermelho passar de 4.5:1
 * sobre o fundo da página, o cartão, o botão suave e o texto sobre o vermelho
 * cheio. O passo é de 0.005, que o CSS (3 casas) representa sem arredondar.
 */
function fitDestructive(
  mode: Mode,
  start: Oklch,
  foreground: Oklch,
  background: Oklch,
  card: Oklch,
  popover: Oklch
): Oklch {
  const direction = mode === "light" ? -1 : 1
  let color = start
  for (let step = 0; step < 100; step++) {
    const soft = (surface: Oklch) => blend(color, surface, SOFT_ALPHA[mode])
    const ok = [
      contrast(color, background),
      contrast(color, card),
      contrast(color, soft(background)),
      contrast(color, soft(popover)),
      contrast(foreground, color),
    ].every((ratio) => ratio >= TEXT)
    if (ok) return color
    const l = Math.round((color.l + direction * 0.005) * 1000) / 1000
    if (l < 0 || l > 1) break
    color = lightness(color, l)
  }
  return color
}

/**
 * `--primary-text`: a primária usada como texto ou link. É a própria primária
 * quando ela já alcança 4.5:1 sobre o fundo da página, o cartão e o popover;
 * senão, a primária com só a luminosidade movida (mais escura no claro, mais
 * clara no escuro) até o menor passo, de 0.005, que passa nas três. O passo é
 * o que o CSS (3 casas) representa sem arredondar.
 */
function fitPrimaryText(mode: Mode, primary: Oklch, surfaces: Oklch[]): Oklch {
  const direction = mode === "light" ? -1 : 1
  const passes = (color: Oklch) =>
    surfaces.every((surface) => contrast(color, surface) >= TEXT)
  let color = primary
  for (let step = 0; step < 200 && !passes(color); step++) {
    const l = Math.round((color.l + direction * 0.005) * 1000) / 1000
    if (l < 0 || l > 1) break
    color = lightness(color, l)
  }
  return color
}

/**
 * `--destructive-soft-hover`: o `destructive` com a maior opacidade (em passos
 * de 1%, até o hover do shadcn) em que o texto vermelho ainda passa de 4.5:1
 * sobre o fundo da página e sobre o popover. Sem opacidade que sirva, fica a
 * do repouso (o portão do repouso reprova).
 */
function softHover(
  mode: Mode,
  destructive: Oklch,
  background: Oklch,
  popover: Oklch
): Token {
  const cap = Math.round(SOFT_HOVER_ALPHA[mode] * 100)
  const rest = Math.round(SOFT_ALPHA[mode] * 100)
  let percent = rest
  for (let candidate = cap; candidate > rest; candidate--) {
    const alpha = candidate / 100
    if (
      [background, popover].every(
        (surface) =>
          contrast(destructive, blend(destructive, surface, alpha)) >= TEXT
      )
    ) {
      percent = candidate
      break
    }
  }
  return translucent(destructive, percent / 100)
}

export function deriveTokens(brand: Brand): Record<Mode, ModeTokens> {
  const ramp = neutralRamp(brand.neutral)
  const primary = parseHex(brand.primary, "primary")
  const charts = [0, 55, 110, 200, 300]

  const darkOnly = brand.scheme === "dark"
  const lightPrimary = primary
  const darkPrimary = darkOnly
    ? primary
    : lightness(primary, Math.max(primary.l, 0.72))
  // Claro: texto branco sobre a primária, salvo `primaryForeground` na marca.
  // Escuro: a primária sobe para L >= 0.72 e o texto é o tom mais escuro. Marca
  // só escura (`scheme: "dark"`): a primária fica como está e o texto sobre ela
  // é o `primaryForeground` ou branco, como no claro.
  const lightPrimaryFg = brand.primaryForeground
    ? parseHex(brand.primaryForeground, "primaryForeground")
    : WHITE
  const darkPrimaryFg = darkOnly ? lightPrimaryFg : ramp[950]
  const lightPrimaryText = fitPrimaryText("light", lightPrimary, [
    ramp[50],
    WHITE,
    WHITE,
  ])
  const darkPrimaryText = fitPrimaryText("dark", darkPrimary, [
    ramp[950],
    ramp[900],
    ramp[900],
  ])

  const lightDestructiveFg = WHITE
  const darkDestructiveFg = ramp[950]
  const lightDestructive = fitDestructive(
    "light",
    { mode: "oklch", l: 0.55, c: 0.22, h: 27 },
    lightDestructiveFg,
    ramp[50],
    WHITE,
    WHITE
  )
  const darkDestructive = fitDestructive(
    "dark",
    { mode: "oklch", l: 0.704, c: 0.191, h: 22.216 },
    darkDestructiveFg,
    ramp[950],
    ramp[900],
    ramp[900]
  )

  const light: ModeTokens = {
    background: solid(ramp[50]),
    foreground: solid(ramp[950]),
    card: solid(WHITE),
    "card-foreground": solid(ramp[950]),
    popover: solid(WHITE),
    "popover-foreground": solid(ramp[950]),
    primary: solid(lightPrimary),
    "primary-foreground": solid(lightPrimaryFg),
    "primary-text": solid(lightPrimaryText),
    secondary: solid(ramp[100]),
    "secondary-foreground": solid(ramp[900]),
    muted: solid(ramp[100]),
    "muted-foreground": solid(ramp[600]),
    accent: solid(ramp[100]),
    "accent-foreground": solid(ramp[900]),
    destructive: solid(lightDestructive),
    "destructive-foreground": solid(lightDestructiveFg),
    "destructive-soft-hover": softHover(
      "light",
      lightDestructive,
      ramp[50],
      WHITE
    ),
    disabled: solid(ramp[200]),
    "disabled-foreground": solid(ramp[600]),
    border: solid(ramp[200]),
    input: solid(inputTone(ramp, "light", [ramp[50], WHITE])),
    ring: solid(lightPrimary),
    sidebar: solid(ramp[100]),
    "sidebar-foreground": solid(ramp[900]),
    "sidebar-primary": solid(lightPrimary),
    "sidebar-primary-foreground": solid(lightPrimaryFg),
    "sidebar-accent": solid(ramp[200]),
    "sidebar-accent-foreground": solid(ramp[900]),
    "sidebar-border": solid(ramp[200]),
    "sidebar-ring": solid(lightPrimary),
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
    "primary-text": solid(darkPrimaryText),
    secondary: solid(ramp[800]),
    "secondary-foreground": solid(ramp[50]),
    muted: solid(ramp[800]),
    "muted-foreground": solid(ramp[400]),
    accent: solid(ramp[800]),
    "accent-foreground": solid(ramp[50]),
    destructive: solid(darkDestructive),
    "destructive-foreground": solid(darkDestructiveFg),
    "destructive-soft-hover": softHover(
      "dark",
      darkDestructive,
      ramp[950],
      ramp[900]
    ),
    disabled: solid(ramp[800]),
    "disabled-foreground": solid(ramp[400]),
    border: translucent(WHITE, 0.1),
    input: solid(inputTone(ramp, "dark", [ramp[950], ramp[900]])),
    ring: solid(darkPrimary),
    sidebar: solid(ramp[900]),
    "sidebar-foreground": solid(ramp[50]),
    "sidebar-primary": solid(darkPrimary),
    "sidebar-primary-foreground": solid(darkPrimaryFg),
    "sidebar-accent": solid(ramp[800]),
    "sidebar-accent-foreground": solid(ramp[50]),
    "sidebar-border": translucent(WHITE, 0.1),
    "sidebar-ring": solid(darkPrimary),
  }
  charts.forEach((offset, index) => {
    const key = `chart-${index + 1}`
    light[key] = solid(hue(primary, offset, 0.62, 0.14))
    dark[key] = solid(hue(primary, offset, 0.72, 0.14))
  })
  // Marca só escura: o claro é o escuro (o mesmo objeto, que `checkContrast`
  // reconhece para não medir duas vezes).
  return { light: darkOnly ? dark : light, dark }
}

// Pares que a marca precisa manter nos dois modos. O último campo é o mínimo
// (padrão 4.5:1, o de texto). Corpo de texto pede 7:1; anel de foco e borda de
// campo pedem 3:1 (componente de interface). Os cinco primeiros pares de 4.5:1
// são o mínimo exigido; os demais são os que os componentes do shadcn de fato
// desenham. Nomes `destructive-soft-*` não são tokens: são a mistura do
// `destructive` com a superfície (veja `withDerived`).
export const CONTRAST_PAIRS: ReadonlyArray<
  readonly [
    foreground: string,
    background: string,
    hint: string,
    minimum?: number,
  ]
> = [
  [
    "foreground",
    "background",
    "texto principal sobre o fundo da página; use uma neutra mais escura",
    BODY,
  ],
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
  [
    "card-foreground",
    "card",
    "texto sobre cartões; use uma neutra mais escura",
    BODY,
  ],
  [
    "popover-foreground",
    "popover",
    "texto sobre popovers e menus; use uma neutra mais escura",
    BODY,
  ],
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
  [
    "primary-text",
    "background",
    "a cor primária usada como texto ou link não é legível sobre o fundo da página; o tom de texto da primária não alcançou 4.5:1",
  ],
  [
    "primary-text",
    "card",
    "a cor primária usada como texto ou link não é legível sobre cartões; o tom de texto da primária não alcançou 4.5:1",
  ],
  [
    "primary-text",
    "popover",
    "a cor primária usada como texto ou link não é legível sobre popovers e menus; o tom de texto da primária não alcançou 4.5:1",
  ],
  ["destructive", "card", "texto de erro sobre cartões"],
  [
    "destructive",
    "popover",
    "texto de erro e item destrutivo de menu sobre popovers e diálogos",
  ],
  ["muted-foreground", "card", "texto secundário sobre cartões"],
  [
    "ring",
    "background",
    "o anel de foco usa a cor primária e não aparece sobre o fundo da página; escureça a primária (claro) ou clareie-a (escuro)",
    NON_TEXT,
  ],
  [
    "ring",
    "card",
    "o anel de foco usa a cor primária e não aparece sobre cartões; escureça a primária (claro) ou clareie-a (escuro)",
    NON_TEXT,
  ],
  [
    "input",
    "background",
    "a borda do campo não aparece sobre o fundo da página; a escala neutra não tem um tom com 3:1",
    NON_TEXT,
  ],
  [
    "input",
    "card",
    "a borda do campo não aparece sobre cartões; a escala neutra não tem um tom com 3:1",
    NON_TEXT,
  ],
  [
    "destructive-foreground",
    "destructive",
    "o texto sobre o botão destrutivo cheio não é legível",
  ],
  [
    "destructive",
    "destructive-soft-background",
    "o texto do botão destrutivo suave sobre o fundo da página não é legível",
  ],
  [
    "destructive",
    "destructive-soft-popover",
    "o texto do botão destrutivo suave sobre popovers e diálogos não é legível",
  ],
  [
    "destructive",
    "destructive-soft-hover-background",
    "o texto do botão destrutivo suave em hover sobre o fundo da página não é legível",
  ],
  [
    "destructive",
    "destructive-soft-hover-popover",
    "o texto do botão destrutivo suave em hover sobre popovers e diálogos não é legível",
  ],
  // A borda vermelha do hover do botão destrutivo suave é não-texto: 3:1.
  [
    "destructive",
    "background",
    "a borda vermelha do botão destrutivo não aparece sobre o fundo da página",
    NON_TEXT,
  ],
  [
    "destructive",
    "card",
    "a borda vermelha do botão destrutivo não aparece sobre cartões",
    NON_TEXT,
  ],
  [
    "destructive",
    "popover",
    "a borda vermelha do botão destrutivo não aparece sobre popovers e diálogos",
    NON_TEXT,
  ],
  [
    "disabled-foreground",
    "disabled",
    "o texto de um controle desabilitado não é legível sobre o fundo dele",
  ],
]

export const MIN_CONTRAST = TEXT

export interface ContrastFailure {
  mode: Mode
  foreground: string
  background: string
  ratio: number
  minimum: number
  message: string
}

/** Os tokens do modo mais as misturas que só o portão mede. */
function withDerived(mode: Mode, tokens: ModeTokens): ModeTokens {
  const destructive = tokens.destructive.color
  const soft = (surface: string): Token =>
    solid(blend(destructive, tokens[surface].color, SOFT_ALPHA[mode]))
  const hover = (surface: string): Token =>
    solid(
      blend(
        destructive,
        tokens[surface].color,
        tokens["destructive-soft-hover"].alpha ?? SOFT_ALPHA[mode]
      )
    )
  return {
    ...tokens,
    "destructive-soft-background": soft("background"),
    "destructive-soft-popover": soft("popover"),
    "destructive-soft-hover-background": hover("background"),
    "destructive-soft-hover-popover": hover("popover"),
  }
}

export function checkContrast(
  tokens: Record<Mode, ModeTokens>
): ContrastFailure[] {
  const failures: ContrastFailure[] = []
  // `scheme: "dark"` entrega o mesmo objeto nos dois modos: mede uma vez.
  const modes = tokens.light === tokens.dark ? (["dark"] as const) : MODES
  for (const mode of modes) {
    const modeTokens = withDerived(mode, tokens[mode])
    for (const [fg, bg, hint, minimum = TEXT] of CONTRAST_PAIRS) {
      const fgToken = modeTokens[fg]
      const bgToken = modeTokens[bg]
      const ratio = contrast(fgToken.color, bgToken.color)
      if (ratio < minimum) {
        failures.push({
          mode,
          foreground: fg,
          background: bg,
          ratio,
          minimum,
          message:
            `modo ${mode}: ${fg} (${toHex(fgToken.color)}) sobre ${bg} ` +
            `(${toHex(bgToken.color)}) tem contraste ${ratio.toFixed(2)}:1, ` +
            `abaixo de ${minimum}:1 — ${hint}`,
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
