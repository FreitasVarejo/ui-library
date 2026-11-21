import type { Brand, Target } from "./brand.ts"

// CSS do tema que corrige o que os componentes oficiais do shadcn fazem por
// conta própria. Os arquivos de `src/components/ui/` são os do shadcn e não se
// editam: o conflito se resolve aqui, mirando `data-slot` e as classes que o
// shadcn escreve no DOM. O mesmo conjunto de regras vai para o campo `css` do
// item `registry:theme` (no consumidor, o CLI põe cada regra na raiz do CSS,
// fora de `@layer`) e para `src/themes/<nome>.css` (a vitrine, prefixado com
// `html[data-brand]`). Regra fora de `@layer` vence os utilitários do Tailwind
// sem `!important`, qualquer que seja a especificidade.

export interface CssRule {
  /** seletores completos; cada um vira uma entrada da lista da regra */
  selectors: string[]
  declarations: Record<string, string>
  /** condição de `@media` que envolve a regra, ex.: `(hover: hover)` */
  media?: string
}

/** Valor do campo `css` do item: declarações, ou regras dentro de um `@media`. */
export type CssField = Record<
  string,
  Record<string, string | Record<string, string>>
>

const TARGET_PX: Record<Exclude<Target, "compact">, string> = {
  comfortable: "44px",
  touch: "56px",
}

// Estados de desabilitado: atributo nativo, `data-disabled` do Base UI e do
// cmdk (que escreve `data-disabled="false"` nos itens habilitados, por isso o
// `:not`) e `aria-disabled` de links e de botões que mantêm o foco.
const OFF =
  ':is(:disabled, [data-disabled]:not([data-disabled="false"]), [aria-disabled="true"])'

// Botão oficial: o `data-slot` é só "button" (ou o do wrapper, como
// "alert-dialog-action") e a variante não vira atributo. O que identifica um
// botão em qualquer wrapper é a classe `group/button` do cva, e a variante só
// existe nas classes: `[class~=...]` casa o token inteiro, então `bg-primary`
// casa `default` e não casa `hover:bg-primary/80`. Preenchido = `bg-primary`
// (default), `bg-secondary`, `bg-destructive/10` (destrutivo suave do shadcn)
// ou `bg-destructive` (o botão cheio de ConfirmDestructive). O que não casa
// (outline, ghost, link, ou uma variante que o consumidor inventar) cai na
// forma de texto, que só troca a cor: nunca deixa o fundo de outro botão com
// texto de desabilitado sobre um fundo que o par não cobre.
const BUTTON = '[data-slot][class~="group/button"]'
const FILLED = [
  '[class~="bg-primary"]',
  '[class~="bg-secondary"]',
  '[class~="bg-destructive"]',
  '[class~="bg-destructive/10"]',
]
const ICON_ONLY = [
  '[class~="size-6"]',
  '[class~="size-7"]',
  '[class~="size-8"]',
  '[class~="size-9"]',
]

const slot = (name: string) => `[data-slot="${name}"]`

// Campo de texto: fundo e texto de desabilitado.
const FIELDS = ["input", "textarea", "select-trigger"]
// Item de lista, menu ou aba: só o texto muda.
const ITEMS = [
  "select-item",
  "dropdown-menu-item",
  "dropdown-menu-checkbox-item",
  "dropdown-menu-radio-item",
  "dropdown-menu-sub-trigger",
  "command-item",
  "command-input",
  "tabs-trigger",
  "sidebar-menu-button",
  "sidebar-menu-sub-button",
  "toggle",
  "toggle-group-item",
]
// Itens clicáveis que ganham altura mínima de alvo de toque.
const TOUCH_ITEMS = [
  "select-item",
  "dropdown-menu-item",
  "dropdown-menu-checkbox-item",
  "dropdown-menu-radio-item",
  "dropdown-menu-sub-trigger",
  "command-item",
  "tabs-trigger",
  "sidebar-menu-button",
  "sidebar-menu-sub-button",
]

const GROUP_CONTROLS = ["input-group-control", "command-input"]

const MUTED = { color: "var(--disabled-foreground)" }
const NO_RING = { "--tw-ring-shadow": "0 0 #0000" }
const FOCUS = {
  outline: "2px solid var(--ring)",
  "outline-offset": "2px",
  ...NO_RING,
}

function focusRules(): CssRule[] {
  return [
    // Todo componente: contorno sólido de 2px na cor do anel. O halo do
    // shadcn (`focus-visible:ring-3 ring-ring/50`) é a `box-shadow` do
    // Tailwind v4 pela variável `--tw-ring-shadow`; zerar só ela mantém as
    // outras sombras do componente.
    { selectors: ["[data-slot]:focus-visible"], declarations: FOCUS },
    // O campo dentro de um grupo (campo com addon, busca da paleta) não leva
    // contorno próprio: quem leva é o grupo, que o shadcn já destaca por `:has`.
    {
      selectors: GROUP_CONTROLS.map((name) => `${slot(name)}:focus-visible`),
      declarations: { outline: "none" },
    },
    {
      selectors: GROUP_CONTROLS.map(
        (name) => `${slot("input-group")}:has(${slot(name)}:focus-visible)`
      ),
      declarations: FOCUS,
    },
    // Rótulo-cartão de checkbox e radio: o shadcn põe o halo no rótulo quando
    // o controle de dentro recebe foco; quem leva o contorno é o controle.
    {
      selectors: [`${slot("field-label")}:has(:focus-visible)`],
      declarations: NO_RING,
    },
  ]
}

function disabledRules(): CssRule[] {
  const only = (names: string[], suffix = "") =>
    `:is(${names.map(slot).join(", ")})${OFF}${suffix}`
  return [
    // Desabilitado se diz por par de token, nunca por opacidade: o shadcn
    // escreve `disabled:opacity-50`, e meia opacidade reprova o contraste.
    // `breadcrumb-page` é a página atual e leva `aria-disabled` por
    // semântica, não por estado: fica fora.
    {
      selectors: [`[data-slot]${OFF}:not(${slot("breadcrumb-page")})`],
      declarations: { opacity: "1" },
    },
    // Botão: preenchido (fundo e texto), contornado e texto (só o texto).
    { selectors: [`${BUTTON}${OFF}`], declarations: MUTED },
    {
      selectors: [`${BUTTON}:is(${FILLED.join(", ")})${OFF}`],
      declarations: { "background-color": "var(--disabled)" },
    },
    // Campos: fundo e texto; a borda fica.
    {
      selectors: [only(FIELDS)],
      declarations: {
        "background-color": "var(--disabled)",
        color: "var(--disabled-foreground)",
      },
    },
    {
      selectors: [
        `${slot("input-group")}:is(:has(:disabled), [data-disabled]:not([data-disabled="false"]))`,
      ],
      declarations: {
        "background-color": "var(--disabled)",
        color: "var(--disabled-foreground)",
        opacity: "1",
      },
    },
    {
      selectors: [
        `${slot("input-group")}:is(:has(:disabled), [data-disabled]:not([data-disabled="false"])) ${slot("input-group-addon")}`,
      ],
      declarations: MUTED,
    },
    {
      selectors: [only(["input-group-control"])],
      declarations: MUTED,
    },
    // Checkbox, switch e radio: trilho e borda na forma do par. Switch e
    // radio não estão em `src/components/ui/`: as regras seguem o markup do
    // shadcn e não são exercitadas na vitrine.
    {
      selectors: [only(["checkbox", "switch", "radio-group-item"])],
      declarations: {
        "background-color": "var(--disabled)",
        "border-color": "var(--disabled-foreground)",
        color: "var(--disabled-foreground)",
      },
    },
    {
      selectors: [`${slot("switch")}${OFF} ${slot("switch-thumb")}`],
      declarations: { "background-color": "var(--disabled-foreground)" },
    },
    // Itens de lista, menu e aba: só o texto, e o ícone junto.
    { selectors: [only(ITEMS)], declarations: MUTED },
    {
      selectors: [only(ITEMS, " svg")],
      declarations: MUTED,
    },
    // Rótulo de controle desabilitado (o shadcn usa `peer-disabled` e
    // `group-data-[disabled=true]`). O checkbox do Base UI é um `span` com
    // `data-disabled`, que nunca casa `:disabled`; por isso o `OFF`.
    {
      selectors: [
        `.peer${OFF} ~ ${slot("label")}`,
        `[data-disabled="true"] ${slot("label")}`,
        `[data-disabled="true"] ${slot("field-label")}`,
      ],
      declarations: { ...MUTED, opacity: "1" },
    },
  ]
}

function surfaceRules(): CssRule[] {
  return [
    // Hover do botão destrutivo suave (`bg-destructive/10`): o shadcn sobe
    // para 20% (30% no escuro) e o texto vermelho deixa de passar 4.5:1. O
    // gerador calcula a maior mistura que passa e a escreve em
    // `--destructive-soft-hover`. A borda vermelha de 1px (o botão já tem
    // `border border-transparent`, então o tamanho não muda) é o segundo
    // sinal de hover; `@media (hover: hover)` é o que o `hover:` do Tailwind
    // v4 faz, para a borda não grudar depois de um toque no celular.
    {
      selectors: [`[data-slot][class~="bg-destructive/10"]:hover`],
      declarations: {
        "background-color": "var(--destructive-soft-hover)",
        "border-color": "var(--destructive)",
      },
      media: "(hover: hover)",
    },
    // A busca da paleta (`CommandInput`) pinta o grupo com `bg-input/30` e
    // `border-input/30`. Com `--input` no tom de borda de campo (3:1), esses
    // 30% viram um cinza pesado no claro; a busca volta a ser uma superfície
    // quieta, nos tokens de superfície.
    {
      selectors: [`${slot("command-input-wrapper")} ${slot("input-group")}`],
      declarations: {
        "background-color": "var(--muted)",
        "border-color": "var(--border)",
      },
    },
  ]
}

function targetRules(target: Target): CssRule[] {
  // `compact` emite os mesmos seletores com `revert-layer`. Fora de `@layer`,
  // isso devolve o valor que o utilitário do Tailwind dava (inclusive o
  // `min-h-16` do textarea). Sem isso, trocar `touch` por `compact` no
  // consumidor deixaria os `min-height` antigos para trás: o CLI do shadcn só
  // substitui regras de mesmo seletor.
  const compact = target === "compact"
  const size = compact ? "revert-layer" : TARGET_PX[target]
  // O checkbox é um quadrado de 16px com uma área de toque invisível
  // (`after:-inset-x-3 after:-inset-y-2`); a área cresce, o desenho não.
  const reach = compact ? size : `calc((16px - ${size}) / 2)`
  return [
    {
      selectors: [
        BUTTON,
        slot("input"),
        slot("select-trigger"),
        slot("toggle"),
        slot("toggle-group-item"),
        ...TOUCH_ITEMS.map(slot),
      ],
      declarations: { "min-height": size },
    },
    // O Textarea do shadcn já tem `min-h-16`; a altura mínima do alvo não
    // pode encolhê-lo.
    {
      selectors: [slot("textarea")],
      declarations: {
        "min-height": compact
          ? size
          : `max(${size}, calc(var(--spacing) * 16))`,
      },
    },
    // Botão só de ícone (`size-*` do cva) e toggle ficam quadrados.
    {
      selectors: [
        ...ICON_ONLY.map((token) => `${BUTTON}${token}`),
        slot("toggle"),
      ],
      declarations: { "min-width": size },
    },
    {
      selectors: [`${slot("checkbox")}::after`],
      declarations: { inset: reach },
    },
    // A lista de abas tem altura fixa (`h-8`) e a aba, `100% - 1px` dela: com
    // alvo maior a lista cresce com a aba.
    {
      selectors: [slot("tabs-list")],
      declarations: { height: compact ? size : "auto" },
    },
  ]
}

/** Regras de CSS do tema, na ordem em que valem (a última vence empate). */
export function themeRules(brand: Brand): CssRule[] {
  return [
    ...focusRules(),
    ...surfaceRules(),
    ...disabledRules(),
    ...targetRules(brand.target),
  ]
}

function declarationList(declarations: Record<string, string>): string {
  return Object.entries(declarations)
    .map(([property, value]) => `  ${property}: ${value};`)
    .join("\n")
}

/** Campo `css` do item de tema: seletor (lista junta) -> declarações. */
export function cssField(rules: CssRule[]): CssField {
  const field: CssField = {}
  for (const rule of rules) {
    const selector = rule.selectors.join(", ")
    if (rule.media) {
      // O CLI do shadcn aceita `@media (...)` com seletor -> declarações.
      const key = `@media ${rule.media}`
      const inner = (field[key] ?? {}) as Record<string, Record<string, string>>
      inner[selector] = { ...inner[selector], ...rule.declarations }
      field[key] = inner
    } else {
      field[selector] = {
        ...(field[selector] as Record<string, string>),
        ...rule.declarations,
      }
    }
  }
  return field
}

/** O mesmo conjunto como CSS da vitrine, preso à marca por `html[data-brand]`. */
export function vitrineCss(brand: Brand, rules: CssRule[]): string {
  return rules
    .map((rule) => {
      const selectors = rule.selectors
        .map((selector) => `html[data-brand="${brand.name}"] ${selector}`)
        .join(",\n")
      const block = `${selectors} {\n${declarationList(rule.declarations)}\n}\n`
      if (!rule.media) return block
      const indented = block
        .trimEnd()
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
      return `@media ${rule.media} {\n${indented}\n}\n`
    })
    .join("\n")
}
