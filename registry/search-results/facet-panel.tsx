import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import type { SearchFacet } from "./types"

export interface FacetPanelProps {
  facets: SearchFacet[]
  selected: Record<string, string[]>
  onChange: (facetId: string, values: string[]) => void
  /** Prefixo de ids, para o painel poder aparecer duas vezes na página. */
  idPrefix: string
}

/** Grupos de checkboxes, um por faceta, com a contagem de cada opção. */
export function FacetPanel({
  facets,
  selected,
  onChange,
  idPrefix,
}: FacetPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      {facets.map((facet) => {
        const chosen = selected[facet.id] ?? []
        return (
          <fieldset key={facet.id} className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{facet.label}</legend>
            {facet.options.map((option) => {
              const id = `${idPrefix}-${facet.id}-${option.value}`
              return (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={chosen.includes(option.value)}
                    onCheckedChange={(checked) =>
                      onChange(
                        facet.id,
                        checked
                          ? [...chosen, option.value]
                          : chosen.filter((value) => value !== option.value)
                      )
                    }
                  />
                  <Label htmlFor={id} className="flex-1 font-normal">
                    {option.label ?? option.value}
                  </Label>
                  {option.count !== undefined ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {option.count}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </fieldset>
        )
      })}
    </div>
  )
}
