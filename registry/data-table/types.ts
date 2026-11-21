import type { ReactNode } from "react"
import type { ColumnDef, RowData } from "@tanstack/react-table"

import type { DataTableFeatures } from "./features"

/** Coluna do TanStack Table v9 já presa às features desta tabela. */
export type DataTableColumn<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData
>

export interface DataTableFacetOption {
  value: string
  /** Texto da opção; o padrão é o próprio valor. */
  label?: string
  /** Quantas linhas têm o valor. Sem isto, a tabela conta nos dados (modo client). */
  count?: number
}

export interface DataTableFacet {
  /** `id` (ou `accessorKey`) da coluna que a faceta filtra. */
  columnId: string
  label: string
  /** Opções da faceta. Omitida no modo client, sai dos valores da coluna. */
  options?: DataTableFacetOption[]
}

export interface DataTableSelection<TData> {
  /** Ids de todas as linhas selecionadas (inclusive de outras páginas). */
  ids: string[]
  /**
   * Linhas selecionadas que a tabela tem em mãos: todas no modo client; no
   * modo server, só as da página atual.
   */
  rows: TData[]
}

export interface DataTableBulkAction<TData> {
  id: string
  label: string
  /** Elemento de ícone, ex.: `<Icons.trash />` (@/lib/icons). */
  icon?: ReactNode
  /** Pede confirmação antes de chamar `onAction`. */
  destructive?: boolean
  /** Textos da confirmação; o padrão sai de `labels.confirmBulk*`. */
  confirm?: {
    title?: ReactNode
    description?: ReactNode
    confirmLabel?: ReactNode
  }
  onAction: (selection: DataTableSelection<TData>) => void | Promise<void>
}

export interface DataTableLabels {
  search: string
  searchAria: string
  clearFilters: string
  filtersAria: string
  columns: string
  columnsAria: string
  facetNoOptions: string
  sortAscending: string
  sortDescending: string
  sortNone: string
  selectAll: string
  selectRow: string
  bulkActions: string
  selectedCount: (count: number) => string
  clearSelection: string
  confirmBulkTitle: (count: number, action: string) => string
  confirmBulkDescription: (count: number) => string
  rowsSelected: (selected: number, total: number) => string
  rowsPerPage: string
  pageOf: (page: number, pages: number) => string
  rowCount: (total: number) => string
  previousPage: string
  nextPage: string
  loading: string
  emptyTitle: string
  emptyDescription: string
  noResultsTitle: string
  noResultsDescription: string
  errorTitle: string
  errorDescription: string
  retry: string
}

export const DEFAULT_LABELS: DataTableLabels = {
  search: "Buscar…",
  searchAria: "Buscar na tabela",
  clearFilters: "Limpar filtros",
  filtersAria: "Filtros",
  columns: "Colunas",
  columnsAria: "Escolher colunas visíveis",
  facetNoOptions: "Nenhuma opção",
  sortAscending: "Ordenar do menor para o maior",
  sortDescending: "Ordenar do maior para o menor",
  sortNone: "Remover a ordenação",
  selectAll: "Selecionar todas as linhas da página",
  selectRow: "Selecionar a linha",
  bulkActions: "Ações em lote",
  selectedCount: (count) =>
    count === 1 ? "1 selecionado" : `${count} selecionados`,
  clearSelection: "Limpar seleção",
  confirmBulkTitle: (count, action) =>
    `${action} ${count === 1 ? "1 item" : `${count} itens`}?`,
  confirmBulkDescription: () => "Esta ação não pode ser desfeita.",
  rowsSelected: (selected, total) =>
    `${selected} de ${total} linha(s) selecionada(s)`,
  rowsPerPage: "Linhas por página",
  pageOf: (page, pages) => `Página ${page} de ${pages}`,
  rowCount: (total) => (total === 1 ? "1 linha" : `${total} linhas`),
  previousPage: "Página anterior",
  nextPage: "Próxima página",
  loading: "Carregando a tabela…",
  emptyTitle: "Nada por aqui",
  emptyDescription: "Ainda não há registros para mostrar.",
  noResultsTitle: "Nenhum resultado",
  noResultsDescription: "Nenhuma linha corresponde à busca e aos filtros.",
  errorTitle: "Não foi possível carregar a tabela",
  errorDescription: "Tente de novo em instantes.",
  retry: "Tentar de novo",
}
