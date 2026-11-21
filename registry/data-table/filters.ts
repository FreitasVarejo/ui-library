import type { Row, RowData, TableFeatures } from "@tanstack/react-table"

/** Minúsculas e sem acento: "Ação" e "acao" são o mesmo termo de busca. */
export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

/**
 * Busca textual: cada palavra do termo precisa aparecer no texto (E lógico),
 * sem distinguir maiúscula nem acento. Termo vazio casa tudo.
 */
export function matchesSearch(text: unknown, term: string): boolean {
  const words = normalizeText(term).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalizeText(text)
  return words.every((word) => haystack.includes(word))
}

/** Faceta de multi-seleção: vazia não filtra; senão, o valor da célula é um dos escolhidos. */
export function matchesFacet(value: unknown, selected: readonly string[]) {
  return selected.length === 0 || selected.includes(String(value ?? ""))
}

export function searchFilterFn<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(row: Row<TFeatures, TData>, columnId: string, filterValue: unknown) {
  return matchesSearch(row.getValue(columnId), String(filterValue ?? ""))
}

export function facetFilterFn<
  TFeatures extends TableFeatures,
  TData extends RowData,
>(row: Row<TFeatures, TData>, columnId: string, filterValue: unknown) {
  return matchesFacet(
    row.getValue(columnId),
    Array.isArray(filterValue) ? (filterValue as string[]) : []
  )
}
