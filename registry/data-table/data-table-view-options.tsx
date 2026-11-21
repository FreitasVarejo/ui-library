import type { RowData, Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icons } from "@/lib/icons"

import type { DataTableFeatures } from "./features"

export interface DataTableViewOptionsProps<TData extends RowData> {
  table: Table<DataTableFeatures, TData>
  label: string
  ariaLabel: string
}

/** Menu de visibilidade de colunas. O nome vem do `header` quando é texto. */
export function DataTableViewOptions<TData extends RowData>({
  table,
  label,
  ariaLabel,
}: DataTableViewOptionsProps<TData>) {
  const columns = table.getAllColumns().filter((column) => column.getCanHide())
  if (columns.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" aria-label={ariaLabel} />}
      >
        <Icons.columns data-icon="inline-start" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          {columns.map((column) => {
            const header = column.columnDef.header
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(visible) =>
                  column.toggleVisibility(!!visible)
                }
              >
                {typeof header === "string" ? header : column.id}
              </DropdownMenuCheckboxItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
