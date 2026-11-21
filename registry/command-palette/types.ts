import type { ReactNode } from "react"

export interface CommandPaletteItem {
  /** Identificador único em toda a paleta (também dos resultados da busca). */
  id: string
  label: string
  /** Elemento de ícone, ex.: `<Icons.file />` (@/lib/icons). */
  icon?: ReactNode
  /** Atalho só para exibir, ex.: `"G I"` ou `"⌘N"`. A paleta não o captura. */
  shortcut?: string
  /** Outras palavras que também encontram o item. */
  keywords?: string[]
  disabled?: boolean
  /** Chamado ao escolher (Enter ou clique), depois de fechar a paleta. */
  onSelect: () => void
}

export interface CommandPaletteGroup {
  id: string
  /** Título do grupo: “Navegação”, “Ações”, “Recentes”. */
  heading: string
  items: CommandPaletteItem[]
}

export interface CommandPaletteLabels {
  title: string
  description: string
  placeholder: string
  empty: string
  searching: string
  searchError: string
  /** Título do grupo com os resultados da busca assíncrona. */
  results: string
  triggerLabel: string
}

export const DEFAULT_LABELS: CommandPaletteLabels = {
  title: "Paleta de comandos",
  description: "Digite para buscar páginas e ações; use as setas e Enter.",
  placeholder: "Digite um comando ou busque…",
  empty: "Nada encontrado.",
  searching: "Buscando…",
  searchError: "Não foi possível buscar agora.",
  results: "Resultados",
  triggerLabel: "Buscar",
}
