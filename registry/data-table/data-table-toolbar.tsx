import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/lib/icons"

import {
  DataTableFacetFilter,
  type FacetFilterOption,
} from "./data-table-facet-filter"
import type { DataTableLabels } from "./types"

export interface ToolbarFacet {
  id: string
  label: string
  options: FacetFilterOption[]
  selected: string[]
}

export interface DataTableToolbarProps {
  labels: DataTableLabels
  searchable: boolean
  searchPlaceholder?: string
  search: string
  onSearchChange: (value: string) => void
  /** Espera, em ms, antes de avisar `onSearchChange` (modo server). */
  searchDebounce: number
  facets: ToolbarFacet[]
  onFacetChange: (id: string, selected: string[]) => void
  filtersActive: boolean
  onClearFilters: () => void
  /** Menu de colunas e o que mais o consumidor quiser à direita. */
  trailing?: ReactNode
}

export function DataTableToolbar({
  labels,
  searchable,
  searchPlaceholder,
  search,
  onSearchChange,
  searchDebounce,
  facets,
  onFacetChange,
  filtersActive,
  onClearFilters,
  trailing,
}: DataTableToolbarProps) {
  // O campo guarda o que a pessoa digitou; o pai só recebe depois do debounce.
  const [draft, setDraft] = useState(search)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // O pai mudou a busca (ex.: limpar filtros): o campo acompanha.
  const [seen, setSeen] = useState(search)
  if (search !== seen) {
    setSeen(search)
    setDraft(search)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  function type(value: string) {
    setDraft(value)
    clearTimeout(timer.current)
    if (searchDebounce <= 0) onSearchChange(value)
    else timer.current = setTimeout(() => onSearchChange(value), searchDebounce)
  }

  return (
    <div
      role="group"
      aria-label={labels.filtersAria}
      className="flex flex-wrap items-center gap-2"
    >
      {searchable ? (
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Icons.search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={draft}
            onChange={(event) => type(event.target.value)}
            placeholder={searchPlaceholder ?? labels.search}
            aria-label={labels.searchAria}
            className="pl-8"
          />
        </div>
      ) : null}
      {facets.map((facet) => (
        <DataTableFacetFilter
          key={facet.id}
          label={facet.label}
          options={facet.options}
          selected={facet.selected}
          onChange={(selected) => onFacetChange(facet.id, selected)}
          emptyLabel={labels.facetNoOptions}
        />
      ))}
      {filtersActive ? (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <Icons.close data-icon="inline-start" />
          {labels.clearFilters}
        </Button>
      ) : null}
      {trailing ? (
        <div className="ml-auto flex items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  )
}
