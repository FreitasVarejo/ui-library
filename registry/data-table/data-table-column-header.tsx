import type { ReactNode } from "react"
import type { Column, RowData } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"

import type { DataTableFeatures } from "./features"
import type { DataTableLabels } from "./types"

export interface DataTableColumnHeaderProps<TData extends RowData> {
  column: Column<DataTableFeatures, TData, unknown>
  title: ReactNode
  labels: Pick<DataTableLabels, "sortAscending" | "sortDescending" | "sortNone">
  className?: string
}

/** Cabeçalho que alterna a ordenação: crescente, decrescente, nenhuma. */
export function DataTableColumnHeader<TData extends RowData>({
  column,
  title,
  labels,
  className,
}: DataTableColumnHeaderProps<TData>) {
  if (!column.getCanSort()) return <span className={className}>{title}</span>

  const sorted = column.getIsSorted()
  const next = column.getNextSortingOrder()
  const action =
    next === "asc"
      ? labels.sortAscending
      : next === "desc"
        ? labels.sortDescending
        : labels.sortNone
  const Icon =
    sorted === "asc"
      ? Icons.sortAsc
      : sorted === "desc"
        ? Icons.sortDesc
        : Icons.sort

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2", className)}
      aria-label={`${typeof title === "string" ? title : ""}: ${action}`.replace(
        /^: /,
        ""
      )}
      onClick={() => {
        if (next === false) column.clearSorting()
        else column.toggleSorting(next === "desc")
      }}
    >
      {title}
      <Icon
        data-icon="inline-end"
        className={cn(!sorted && "text-muted-foreground")}
      />
    </Button>
  )
}
