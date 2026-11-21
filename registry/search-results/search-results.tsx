import { useId, useState } from "react"
import type { FormEvent, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EmptyState, ErrorState, LoadingState } from "@/components/states"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"

import { FacetPanel } from "./facet-panel"
import { HighlightedText } from "./highlighted-text"
import { DEFAULT_LABELS } from "./types"
import type {
  SearchFacet,
  SearchLinkComponent,
  SearchResultItem,
  SearchResultsLabels,
  SearchSortOption,
  SearchStatus,
} from "./types"

export interface SearchResultsProps {
  /** Termo da busca já feita (o que aparece em “N resultados para …”). */
  query: string
  /** Chamado ao enviar o campo (Enter ou botão). */
  onSearch: (query: string) => void
  status: SearchStatus
  results?: SearchResultItem[]
  /** Total de resultados da busca (pode ser maior que `results`). */
  total?: number

  facets?: SearchFacet[]
  selectedFacets?: Record<string, string[]>
  onFacetsChange?: (selected: Record<string, string[]>) => void

  sortOptions?: SearchSortOption[]
  sort?: string
  onSortChange?: (sort: string) => void

  onRetry?: () => void
  /** Componente de link dos títulos (padrão `"a"`); passe o `Link` do roteador. */
  linkComponent?: SearchLinkComponent
  /** Paginação ou “carregar mais”, abaixo da lista. */
  footer?: ReactNode
  labels?: Partial<SearchResultsLabels>
  className?: string
}

/**
 * Busca com resultados: campo, filtros por faceta (coluna lateral quando o bloco é largo,
 * Sheet no celular), contagem, ordenação e a lista com trechos destacados.
 * Navegação, dados e link entram por props; o bloco não busca nada.
 */
export function SearchResults({
  query,
  onSearch,
  status,
  results = [],
  total,
  facets = [],
  selectedFacets = {},
  onFacetsChange,
  sortOptions = [],
  sort,
  onSortChange,
  onRetry,
  linkComponent: Link = "a",
  footer,
  labels: labelsProp,
  className,
}: SearchResultsProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const baseId = useId()
  // O campo guarda o que a pessoa digita; `query` é a busca já feita.
  const [draft, setDraft] = useState(query)
  const [seenQuery, setSeenQuery] = useState(query)
  if (query !== seenQuery) {
    setSeenQuery(query)
    setDraft(query)
  }
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilters = Object.values(selectedFacets).reduce(
    (sum, values) => sum + values.length,
    0
  )
  const count = total ?? results.length

  function submit(event: FormEvent) {
    event.preventDefault()
    onSearch(draft.trim())
  }

  function changeFacet(facetId: string, values: string[]) {
    onFacetsChange?.({ ...selectedFacets, [facetId]: values })
  }

  const clearFilters = () => onFacetsChange?.({})

  const sortItems = sortOptions.map((option) => ({
    value: option.value,
    label: option.label,
  }))

  let body: ReactNode
  if (status === "idle") {
    body = (
      <EmptyState
        icon={<Icons.search />}
        title={labels.idleTitle}
        description={labels.idleDescription}
      />
    )
  } else if (status === "loading") {
    body = <LoadingState variant="list" label={labels.loading} />
  } else if (status === "error") {
    body = (
      <ErrorState
        title={labels.errorTitle}
        description={labels.errorDescription}
        onRetry={onRetry}
        retryLabel={labels.retry}
      />
    )
  } else if (results.length === 0) {
    body = (
      <EmptyState
        title={labels.emptyTitle}
        description={
          activeFilters > 0
            ? labels.emptyWithFiltersDescription
            : labels.emptyDescription(query)
        }
        action={
          activeFilters > 0 ? (
            <Button variant="outline" onClick={clearFilters}>
              {labels.clearFilters}
            </Button>
          ) : undefined
        }
      />
    )
  } else {
    body = (
      <ol aria-label={labels.resultsAria} className="flex flex-col divide-y">
        {results.map((result) => (
          <li key={result.id} className="py-4 first:pt-0 last:pb-0">
            <article className="flex flex-col gap-1.5">
              <h3 className="flex items-center gap-2 text-base font-medium">
                {result.icon ? (
                  <span aria-hidden="true" className="text-muted-foreground">
                    {result.icon}
                  </span>
                ) : null}
                {result.href ? (
                  <Link
                    href={result.href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    <HighlightedText
                      text={result.title}
                      ranges={result.titleHighlights}
                    />
                  </Link>
                ) : (
                  <span>
                    <HighlightedText
                      text={result.title}
                      ranges={result.titleHighlights}
                    />
                  </span>
                )}
              </h3>
              {result.snippet ? (
                <p className="text-sm text-muted-foreground">
                  <HighlightedText
                    text={result.snippet}
                    ranges={result.highlights}
                  />
                </p>
              ) : null}
              {result.meta && result.meta.length > 0 ? (
                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {result.meta.map((item) => (
                    <div key={item.label} className="flex gap-1">
                      <dt className="sr-only">{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </article>
          </li>
        ))}
      </ol>
    )
  }

  const showHeader = status === "ready" && results.length > 0

  return (
    <div
      data-slot="search-results"
      className={cn("@container flex min-w-0 flex-col gap-4", className)}
    >
      <form role="search" onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Icons.search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchAria}
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" className="h-9">
          {labels.searchButton}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {showHeader ? labels.resultCount(count, query) : null}
        </p>
        <div className="flex items-center gap-2">
          {facets.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="@3xl:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <Icons.filter data-icon="inline-start" />
              {labels.filters}
              {activeFilters > 0 ? ` (${activeFilters})` : null}
            </Button>
          ) : null}
          {sortOptions.length > 0 && sort !== undefined ? (
            <div className="flex items-center gap-2 text-sm">
              <span id={`${baseId}-sort`} className="text-muted-foreground">
                {labels.sortBy}
              </span>
              <Select
                items={sortItems}
                value={sort}
                onValueChange={(value) => value && onSortChange?.(value)}
              >
                <SelectTrigger size="sm" aria-labelledby={`${baseId}-sort`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "grid min-w-0 gap-6",
          facets.length > 0 && "@3xl:grid-cols-[14rem_minmax(0,1fr)]"
        )}
      >
        {facets.length > 0 ? (
          <aside
            aria-label={labels.filtersTitle}
            className="hidden flex-col gap-4 @3xl:flex"
          >
            <FacetPanel
              facets={facets}
              selected={selectedFacets}
              onChange={changeFacet}
              idPrefix={`${baseId}-side`}
            />
            {activeFilters > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <Icons.close data-icon="inline-start" />
                {labels.clearFilters}
              </Button>
            ) : null}
          </aside>
        ) : null}
        <div className="min-w-0 flex-1" aria-busy={status === "loading"}>
          {body}
          {showHeader && footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>

      {facets.length > 0 ? (
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="bottom" className="max-h-[85svh]">
            <SheetHeader>
              <SheetTitle>{labels.filtersTitle}</SheetTitle>
              <SheetDescription>{labels.filtersDescription}</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-4">
              <FacetPanel
                facets={facets}
                selected={selectedFacets}
                onChange={changeFacet}
                idPrefix={`${baseId}-sheet`}
              />
            </div>
            <SheetFooter>
              <Button onClick={() => setFiltersOpen(false)}>
                {status === "ready"
                  ? labels.showResults(count)
                  : labels.filters}
              </Button>
              {activeFilters > 0 ? (
                <Button variant="ghost" onClick={clearFilters}>
                  {labels.clearFilters}
                </Button>
              ) : null}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  )
}
