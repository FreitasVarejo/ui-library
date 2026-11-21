import { useMemo } from "react"
import type { ReactNode } from "react"
import { useTable } from "@tanstack/react-table"
import type {
  ColumnFiltersState,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
  Updater,
} from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { EmptyState, ErrorState, LoadingState } from "@/components/states"
import { cn } from "@/lib/utils"

import { DataTableBulkBar } from "./data-table-bulk-bar"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"
import type { ToolbarFacet } from "./data-table-toolbar"
import { DataTableViewOptions } from "./data-table-view-options"
import { features } from "./features"
import { DEFAULT_LABELS } from "./types"
import type {
  DataTableBulkAction,
  DataTableColumn,
  DataTableFacet,
  DataTableFacetOption,
  DataTableLabels,
} from "./types"
import { useControllable } from "./use-controllable"

type VisibilityState = Record<string, boolean>
type FacetState = Record<string, string[]>

export interface DataTableProps<TData extends RowData> {
  columns: DataTableColumn<TData>[]
  data: TData[]
  /** Id estável da linha. Padrão: o campo `id` do registro, senão o índice. */
  getRowId?: (row: TData, index: number) => string

  /**
   * `client` (padrão): a tabela busca, filtra, ordena e pagina `data`.
   * `server`: o pai faz isso; `data` é a página atual, `rowCount` o total e
   * toda mudança de estado sai pelos callbacks `on*Change`.
   */
  mode?: "client" | "server"
  /** Total de linhas no servidor (modo server). */
  rowCount?: number

  /** Campo de busca textual. Padrão: ligado. */
  searchable?: boolean
  searchPlaceholder?: string
  /** Espera, em ms, antes de avisar a busca. Padrão: 0 (client) e 300 (server). */
  searchDebounce?: number
  search?: string
  onSearchChange?: (search: string) => void

  /** Filtros por faceta (multi-seleção com contagem). */
  facets?: DataTableFacet[]
  facetFilters?: FacetState
  onFacetFiltersChange?: (filters: FacetState) => void

  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void

  /** Paginação. `false` mostra tudo. */
  paginated?: boolean
  pageSizeOptions?: number[]
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void

  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void

  /** Coluna de checkbox. Ligada sozinha quando há `bulkActions`. */
  selectable?: boolean
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (selection: RowSelectionState) => void
  bulkActions?: DataTableBulkAction<TData>[]

  /** Carregando: sem linhas, mostra o esqueleto; com linhas, mantém e marca ocupado. */
  loading?: boolean
  /** Falha de carga: `true` ou o detalhe técnico a mostrar. */
  error?: boolean | ReactNode
  onRetry?: () => void
  /** Substitui o estado vazio (tabela sem nenhum registro). */
  emptyState?: ReactNode
  /** Controles extras à direita da barra de ferramentas. */
  toolbarActions?: ReactNode
  labels?: Partial<DataTableLabels>
  className?: string
}

const SELECT_COLUMN_ID = "select"

function defaultRowId(row: unknown, index: number) {
  const id = (row as { id?: unknown } | null)?.id
  return id === undefined || id === null ? String(index) : String(id)
}

function toColumnFilters(facets: FacetState): ColumnFiltersState {
  return Object.entries(facets)
    .filter(([, value]) => value.length > 0)
    .map(([id, value]) => ({ id, value }))
}

function fromColumnFilters(filters: ColumnFiltersState): FacetState {
  return Object.fromEntries(
    filters.map((filter) => [filter.id, filter.value as string[]])
  )
}

function resolve<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function"
    ? (updater as (previous: T) => T)(previous)
    : updater
}

/**
 * Tabela de dados sobre o TanStack Table v9 e o `table` do shadcn. Dois modos:
 * `client` (dados todos na mão) e `server` (estado controlado por props, para
 * paginar no servidor). A densidade vem do tema: o espaçamento da célula é
 * `--spacing`.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId = defaultRowId,
  mode = "client",
  rowCount,
  searchable = true,
  searchPlaceholder,
  searchDebounce,
  search: searchProp,
  onSearchChange,
  facets = [],
  facetFilters: facetFiltersProp,
  onFacetFiltersChange,
  sorting: sortingProp,
  onSortingChange,
  paginated = true,
  pageSizeOptions = [10, 20, 50],
  pagination: paginationProp,
  onPaginationChange,
  columnVisibility: visibilityProp,
  onColumnVisibilityChange,
  selectable,
  rowSelection: selectionProp,
  onRowSelectionChange,
  bulkActions = [],
  loading = false,
  error = false,
  onRetry,
  emptyState,
  toolbarActions,
  labels: labelsProp,
  className,
}: DataTableProps<TData>) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const server = mode === "server"
  const withSelection = selectable ?? bulkActions.length > 0

  const [sorting, setSorting] = useControllable<SortingState>(
    sortingProp,
    onSortingChange,
    []
  )
  const [search, setSearch] = useControllable(searchProp, onSearchChange, "")
  const [facetFilters, setFacetFilters] = useControllable<FacetState>(
    facetFiltersProp,
    onFacetFiltersChange,
    {}
  )
  const [pagination, setPagination] = useControllable<PaginationState>(
    paginationProp,
    onPaginationChange,
    { pageIndex: 0, pageSize: pageSizeOptions[0] ?? 10 }
  )
  const [columnVisibility, setColumnVisibility] =
    useControllable<VisibilityState>(
      visibilityProp,
      onColumnVisibilityChange,
      {}
    )
  const [rowSelection, setRowSelection] = useControllable<RowSelectionState>(
    selectionProp,
    onRowSelectionChange,
    {}
  )

  function backToFirstPage() {
    if (pagination.pageIndex !== 0)
      setPagination({ ...pagination, pageIndex: 0 })
  }

  const allColumns = useMemo<DataTableColumn<TData>[]>(
    () =>
      withSelection
        ? [
            {
              id: SELECT_COLUMN_ID,
              header: ({ table }) => (
                <Checkbox
                  checked={table.getIsAllPageRowsSelected()}
                  indeterminate={
                    table.getIsSomePageRowsSelected() &&
                    !table.getIsAllPageRowsSelected()
                  }
                  onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                  }
                  aria-label={labels.selectAll}
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label={labels.selectRow}
                />
              ),
              enableSorting: false,
              enableHiding: false,
              enableGlobalFilter: false,
            },
            ...columns,
          ]
        : columns,
    [columns, withSelection, labels.selectAll, labels.selectRow]
  )

  const table = useTable({
    features,
    data,
    columns: allColumns,
    getRowId,
    defaultColumn: { filterFn: "facet" },
    globalFilterFn: "search",
    manualSorting: server,
    manualFiltering: server,
    manualPagination: server || !paginated,
    autoResetPageIndex: false,
    rowCount: server ? rowCount : undefined,
    enableRowSelection: withSelection,
    state: {
      sorting,
      globalFilter: search,
      columnFilters: toColumnFilters(facetFilters),
      pagination: paginated
        ? pagination
        : { pageIndex: 0, pageSize: Math.max(data.length, 1) },
      columnVisibility,
      rowSelection,
    },
    onSortingChange: (updater) => {
      setSorting(resolve(updater, sorting))
      backToFirstPage()
    },
    onGlobalFilterChange: (updater) => {
      setSearch(resolve(updater, search) ?? "")
      setRowSelection({})
      backToFirstPage()
    },
    onColumnFiltersChange: (updater) => {
      setFacetFilters(
        fromColumnFilters(resolve(updater, toColumnFilters(facetFilters)))
      )
      setRowSelection({})
      backToFirstPage()
    },
    onPaginationChange: (updater) =>
      setPagination(resolve(updater, pagination)),
    onColumnVisibilityChange: (updater) =>
      setColumnVisibility(resolve(updater, columnVisibility)),
    onRowSelectionChange: (updater) =>
      setRowSelection(resolve(updater, rowSelection)),
  })

  const rows = table.getRowModel().rows
  const filtersActive =
    search.trim() !== "" ||
    Object.values(facetFilters).some((value) => value.length > 0)

  // Opções das facetas: do pai (modo server) ou dos valores da coluna.
  const toolbarFacets: ToolbarFacet[] = facets.map((facet) => {
    const column = table.getColumn(facet.columnId)
    const counts = column?.getFacetedUniqueValues()
    const options: DataTableFacetOption[] =
      facet.options ??
      [
        ...new Set(
          data.map((row) => String(column?.accessorFn?.(row, 0) ?? ""))
        ),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((value) => ({ value }))
    return {
      id: facet.columnId,
      label: facet.label,
      selected: facetFilters[facet.columnId] ?? [],
      options: options.map((option) => ({
        value: option.value,
        label: option.label ?? option.value,
        count: option.count ?? counts?.get(option.value) ?? 0,
      })),
    }
  })

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const selectedRows = table
    .getCoreRowModel()
    .rows.filter((row) => rowSelection[row.id])
    .map((row) => row.original)

  function clearFilters() {
    setSearch("")
    setFacetFilters({})
    setRowSelection({})
    backToFirstPage()
  }

  const totalRows = server ? (rowCount ?? data.length) : table.getRowCount()

  let body: ReactNode
  if (error) {
    body = (
      <ErrorState
        title={labels.errorTitle}
        description={labels.errorDescription}
        detail={typeof error === "boolean" ? undefined : error}
        onRetry={onRetry}
        retryLabel={labels.retry}
        className="border-0"
      />
    )
  } else if (loading && data.length === 0) {
    body = (
      <LoadingState variant="table" label={labels.loading} className="p-4" />
    )
  } else if (rows.length === 0) {
    body =
      !filtersActive && emptyState !== undefined ? (
        emptyState
      ) : (
        <EmptyState
          title={filtersActive ? labels.noResultsTitle : labels.emptyTitle}
          description={
            filtersActive
              ? labels.noResultsDescription
              : labels.emptyDescription
          }
          action={
            filtersActive ? (
              <Button variant="outline" onClick={clearFilters}>
                {labels.clearFilters}
              </Button>
            ) : undefined
          }
          className="border-0"
        />
      )
  }

  return (
    <div
      data-slot="data-table"
      data-mode={mode}
      className={cn("flex min-w-0 flex-col gap-3", className)}
    >
      <DataTableToolbar
        labels={labels}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        search={search}
        onSearchChange={(value) => table.setGlobalFilter(value)}
        searchDebounce={searchDebounce ?? (server ? 300 : 0)}
        facets={toolbarFacets}
        onFacetChange={(id, selected) =>
          table.getColumn(id)?.setFilterValue(selected)
        }
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
        trailing={
          <>
            {toolbarActions}
            <DataTableViewOptions
              table={table}
              label={labels.columns}
              ariaLabel={labels.columnsAria}
            />
          </>
        }
      />

      {withSelection && selectedIds.length > 0 ? (
        <DataTableBulkBar
          actions={bulkActions}
          selection={{ ids: selectedIds, rows: selectedRows }}
          labels={labels}
          onClear={() => setRowSelection({})}
        />
      ) : null}

      <div
        className="min-w-0 rounded-lg border"
        aria-busy={loading || undefined}
      >
        {body ?? (
          <Table className={cn(loading && "opacity-60")}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    const definition = header.column.columnDef.header
                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : undefined
                        }
                      >
                        {header.isPlaceholder ? null : typeof definition ===
                          "string" ? (
                          <DataTableColumnHeader
                            column={header.column}
                            title={definition}
                            labels={labels}
                          />
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {paginated && !error && (rows.length > 0 || totalRows > 0) ? (
        <DataTablePagination
          table={table}
          pagination={pagination}
          pageSizeOptions={pageSizeOptions}
          labels={labels}
          selectedCount={withSelection ? selectedIds.length : undefined}
          totalRows={totalRows}
        />
      ) : null}
    </div>
  )
}
