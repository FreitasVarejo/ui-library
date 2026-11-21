import { useState } from "react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { useConfirmDestructive } from "@/components/feedback"
import { Icons } from "@/lib/icons"

import type {
  DataTableBulkAction,
  DataTableLabels,
  DataTableSelection,
} from "./types"

export interface DataTableBulkBarProps<TData> {
  actions: DataTableBulkAction<TData>[]
  selection: DataTableSelection<TData>
  labels: DataTableLabels
  onClear: () => void
}

/**
 * Barra que aparece com linhas selecionadas. Ação destrutiva pede confirmação;
 * ao terminar sem erro, a seleção é limpa.
 */
export function DataTableBulkBar<TData>({
  actions,
  selection,
  labels,
  onClear,
}: DataTableBulkBarProps<TData>) {
  const { confirm, dialog } = useConfirmDestructive()
  const [running, setRunning] = useState<string | null>(null)
  const count = selection.ids.length

  async function run(action: DataTableBulkAction<TData>) {
    if (action.destructive) {
      const confirmed = await confirm({
        title:
          action.confirm?.title ?? labels.confirmBulkTitle(count, action.label),
        description:
          action.confirm?.description ?? labels.confirmBulkDescription(count),
        confirmLabel: action.confirm?.confirmLabel ?? action.label,
      })
      if (!confirmed) return
    }
    setRunning(action.id)
    try {
      await action.onAction(selection)
      onClear()
    } finally {
      setRunning(null)
    }
  }

  return (
    <div
      role="region"
      aria-label={labels.bulkActions}
      data-slot="data-table-bulk-bar"
      className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted px-3 py-2 text-sm"
    >
      <p className="mr-auto font-medium" aria-live="polite">
        {labels.selectedCount(count)}
      </p>
      {actions.map((action): ReactNode => (
        <Button
          key={action.id}
          size="sm"
          variant={action.destructive ? "destructive" : "outline"}
          disabled={running !== null}
          onClick={() => void run(action)}
        >
          {action.icon ? (
            <span data-icon="inline-start">{action.icon}</span>
          ) : null}
          {action.label}
        </Button>
      ))}
      <Button size="sm" variant="ghost" onClick={onClear}>
        <Icons.close data-icon="inline-start" />
        {labels.clearSelection}
      </Button>
      {dialog}
    </div>
  )
}
