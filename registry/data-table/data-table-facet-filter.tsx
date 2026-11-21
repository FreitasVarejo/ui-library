import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icons } from "@/lib/icons"

export interface FacetFilterOption {
  value: string
  label: string
  count?: number
}

export interface DataTableFacetFilterProps {
  label: string
  options: FacetFilterOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  emptyLabel: string
}

/** Filtro por faceta: multi-seleção com a contagem de cada opção. */
export function DataTableFacetFilter({
  label,
  options,
  selected,
  onChange,
  emptyLabel,
}: DataTableFacetFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Icons.filter data-icon="inline-start" />
        {label}
        {selected.length > 0 ? (
          <Badge variant="secondary" aria-label={`${selected.length}`}>
            {selected.length}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {options.length === 0 ? (
            <p className="px-1.5 py-1 text-sm text-muted-foreground">
              {emptyLabel}
            </p>
          ) : null}
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...selected, option.value]
                    : selected.filter((value) => value !== option.value)
                )
              }
            >
              <span className="flex-1 truncate">{option.label}</span>
              {option.count !== undefined ? (
                <span className="ml-3 text-xs text-muted-foreground tabular-nums">
                  {option.count}
                </span>
              ) : null}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
