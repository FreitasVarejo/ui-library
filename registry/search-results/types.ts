import type { ElementType, ReactNode } from "react"

import type { HighlightRange } from "./highlight"

/** Link injetável: recebe `href`. Padrão `"a"`; com roteador, o `Link` dele. */
export type SearchLinkComponent = ElementType<{ href: string }>

export interface SearchResultItem {
  id: string
  title: string
  /** Faixas a destacar em `title`. */
  titleHighlights?: HighlightRange[]
  href?: string
  snippet?: string
  /** Faixas a destacar em `snippet`. */
  highlights?: HighlightRange[]
  /** Metadados curtos: tipo, autor, data… */
  meta?: Array<{ label: string; value: ReactNode }>
  /** Elemento de ícone, ex.: `<Icons.file />` (@/lib/icons). */
  icon?: ReactNode
}

export interface SearchFacetOption {
  value: string
  label?: string
  count?: number
}

export interface SearchFacet {
  id: string
  label: string
  options: SearchFacetOption[]
}

export interface SearchSortOption {
  value: string
  label: string
}

/**
 * `idle`: ainda não buscou. `loading`: buscando. `ready`: resposta recebida
 * (com ou sem resultados). `error`: a busca falhou.
 */
export type SearchStatus = "idle" | "loading" | "ready" | "error"

export interface SearchResultsLabels {
  searchAria: string
  searchPlaceholder: string
  searchButton: string
  filters: string
  filtersTitle: string
  filtersDescription: string
  clearFilters: string
  showResults: (count: number) => string
  sortBy: string
  resultCount: (total: number, query: string) => string
  idleTitle: string
  idleDescription: string
  loading: string
  emptyTitle: string
  emptyDescription: (query: string) => string
  emptyWithFiltersDescription: string
  errorTitle: string
  errorDescription: string
  retry: string
  resultsAria: string
}

export const DEFAULT_LABELS: SearchResultsLabels = {
  searchAria: "Buscar",
  searchPlaceholder: "Buscar no acervo…",
  searchButton: "Buscar",
  filters: "Filtros",
  filtersTitle: "Filtros",
  filtersDescription: "Refine os resultados da busca.",
  clearFilters: "Limpar filtros",
  showResults: (count) =>
    count === 1 ? "Ver 1 resultado" : `Ver ${count} resultados`,
  sortBy: "Ordenar por",
  resultCount: (total, query) =>
    `${total === 1 ? "1 resultado" : `${total} resultados`}${
      query ? ` para “${query}”` : ""
    }`,
  idleTitle: "Busque no acervo",
  idleDescription: "Digite um termo para encontrar documentos.",
  loading: "Buscando…",
  emptyTitle: "Nenhum resultado",
  emptyDescription: (query) =>
    query
      ? `Nada encontrado para “${query}”. Confira a grafia ou use outros termos.`
      : "Nada encontrado.",
  emptyWithFiltersDescription:
    "Nenhum resultado com estes filtros. Limpe os filtros para ampliar a busca.",
  errorTitle: "A busca falhou",
  errorDescription: "Não foi possível buscar agora. Tente de novo.",
  retry: "Tentar de novo",
  resultsAria: "Resultados da busca",
}
