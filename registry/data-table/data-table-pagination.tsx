import type { PaginationState, RowData, Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Icons } from "@/lib/icons"

import type { DataTableFeatures } from "./features"
import type { DataTableLabels } from "./types"

export interface DataTablePaginationProps<TData extends RowData> {
  table: Table<DataTableFeatures, TData>
  pagination: PaginationState
  pageSizeOptions: number[]
  labels: DataTableLabels
  /** Total de selecionadas; `undefined` esconde o resumo da seleção. */
  selectedCount?: number
  totalRows: number
}

export function DataTablePagination<TData extends RowData>({
  table,
  pagination,
  pageSizeOptions,
  labels,
  selectedCount,
  totalRows,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = pagination
  const pageCount = Math.max(table.getPageCount(), 1)
  const items = pageSizeOptions.map((size) => ({
    value: String(size),
    label: String(size),
  }))

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm">
      <p className="text-muted-foreground" aria-live="polite">
        {selectedCount === undefined
          ? labels.rowCount(totalRows)
          : labels.rowsSelected(selectedCount, totalRows)}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span id="data-table-page-size" className="text-muted-foreground">
            {labels.rowsPerPage}
          </span>
          <Select
            items={items}
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="w-18"
              aria-labelledby="data-table-page-size"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="tabular-nums">
          {labels.pageOf(pageIndex + 1, pageCount)}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={labels.previousPage}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <Icons.chevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={labels.nextPage}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <Icons.chevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
