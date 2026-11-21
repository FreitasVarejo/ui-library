import { useEffect, useRef, useState } from "react"
import type { ComponentProps, ReactElement } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"

import { paletteFilter, REMOTE_PREFIX } from "./filter"
import { formatShortcut, matchesShortcut } from "./shortcut"
import { DEFAULT_LABELS } from "./types"
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
  CommandPaletteLabels,
} from "./types"
import { useControllable } from "./use-controllable"

export interface CommandPaletteProps {
  /** Grupos fixos: navegação, ações, recentes… Quem monta a lista é o pai. */
  groups: CommandPaletteGroup[]
  /**
   * Busca assíncrona opcional. Os itens devolvidos entram num grupo
   * “Resultados”, sem filtro local (o servidor já filtrou). `signal` aborta
   * quando a pessoa continua digitando ou fecha a paleta. Trocar a função não
   * refaz a consulta; só mudar o texto refaz.
   */
  search?: (
    query: string,
    context: { signal: AbortSignal }
  ) => Promise<CommandPaletteItem[]>
  /** Espera, em ms, depois da última tecla antes de buscar (padrão 200). */
  searchDebounce?: number
  /** Tamanho mínimo da busca para chamar `search` (padrão 1). */
  searchMinLength?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Atalho global, ex.: `"mod+k"` (padrão; Ctrl ou Cmd). `null` desliga. */
  shortcut?: string | null
  /**
   * Gatilho: um elemento que abre a paleta ao clicar (ex.:
   * `<CommandPaletteTrigger />`). Sem ele, só o atalho (ou `open`) abre.
   */
  trigger?: ReactElement
  labels?: Partial<CommandPaletteLabels>
  className?: string
}

type SearchState =
  | { query: string; items: CommandPaletteItem[]; failed: false }
  | { query: string; items: []; failed: true }

function PaletteItem({
  item,
  value,
  onChoose,
}: {
  item: CommandPaletteItem
  value: string
  onChoose: (item: CommandPaletteItem) => void
}) {
  return (
    <CommandItem
      value={value}
      keywords={[item.label, ...(item.keywords ?? [])]}
      disabled={item.disabled}
      onSelect={() => onChoose(item)}
    >
      {item.icon}
      <span className="min-w-0 truncate">{item.label}</span>
      {item.shortcut ? (
        <CommandShortcut>{item.shortcut}</CommandShortcut>
      ) : null}
    </CommandItem>
  )
}

function PaletteBody({
  groups,
  search,
  searchDebounce,
  searchMinLength,
  labels,
  onChoose,
}: {
  groups: CommandPaletteGroup[]
  search: CommandPaletteProps["search"]
  searchDebounce: number
  searchMinLength: number
  labels: CommandPaletteLabels
  onChoose: (item: CommandPaletteItem) => void
}) {
  const [query, setQuery] = useState("")
  const [committed, setCommitted] = useState("")
  const [state, setState] = useState<SearchState>()

  const trimmed = query.trim()
  const enabled = search !== undefined
  const searching = enabled && trimmed.length >= searchMinLength

  // A busca mais recente, sem refazer a consulta quando o pai troca a função.
  const latest = useRef(search)
  useEffect(() => {
    latest.current = search
  })

  // Espera a pessoa parar de digitar.
  useEffect(() => {
    const timer = setTimeout(() => setCommitted(trimmed), searchDebounce)
    return () => clearTimeout(timer)
  }, [trimmed, searchDebounce])

  useEffect(() => {
    const run = latest.current
    if (!enabled || !run || committed.length < searchMinLength) return
    const controller = new AbortController()
    run(committed, { signal: controller.signal }).then(
      (items) => {
        if (!controller.signal.aborted)
          setState({ query: committed, items, failed: false })
      },
      () => {
        if (!controller.signal.aborted)
          setState({ query: committed, items: [], failed: true })
      }
    )
    return () => controller.abort()
  }, [enabled, committed, searchMinLength])

  // Carregando = a busca atual ainda não tem resposta para o que está no campo.
  const settled = state?.query === trimmed ? state : undefined
  const loading = searching && settled === undefined
  const failed = settled?.failed === true
  const remote = searching ? (settled?.items ?? []) : []

  return (
    <Command filter={paletteFilter} loop>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={labels.placeholder}
        aria-label={labels.placeholder}
      />
      <CommandList>
        {loading ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 px-2 py-6 text-sm text-muted-foreground"
          >
            <Icons.loading
              aria-hidden="true"
              className="size-4 motion-safe:animate-spin"
            />
            {labels.searching}
          </div>
        ) : null}
        {failed ? (
          <div
            role="status"
            className="px-2 py-3 text-center text-sm text-destructive"
          >
            {labels.searchError}
          </div>
        ) : null}
        {loading ? null : <CommandEmpty>{labels.empty}</CommandEmpty>}
        {remote.length > 0 ? (
          <CommandGroup heading={labels.results}>
            {remote.map((item) => (
              <PaletteItem
                key={item.id}
                item={item}
                value={`${REMOTE_PREFIX}${item.id}`}
                onChoose={onChoose}
              />
            ))}
          </CommandGroup>
        ) : null}
        {groups.map((group) => (
          <CommandGroup key={group.id} heading={group.heading}>
            {group.items.map((item) => (
              <PaletteItem
                key={item.id}
                item={item}
                value={`${group.id}:${item.id}`}
                onChoose={onChoose}
              />
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  )
}

/**
 * Paleta de comandos sobre o `command` do shadcn (cmdk), num diálogo. Abre
 * com o atalho global (Ctrl/Cmd+K por padrão) e pelo `trigger`. Os grupos e
 * a busca assíncrona vêm por props; o bloco não navega nem busca sozinho.
 * Escolher um item fecha a paleta e chama o `onSelect` dele.
 */
export function CommandPalette({
  groups,
  search,
  searchDebounce = 200,
  searchMinLength = 1,
  open: openProp,
  onOpenChange,
  shortcut = "mod+k",
  trigger,
  labels: labelsProp,
  className,
}: CommandPaletteProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const [open, setOpen] = useControllable(openProp, onOpenChange, false)

  useEffect(() => {
    if (!shortcut) return
    function onKeyDown(event: KeyboardEvent) {
      if (!matchesShortcut(event, shortcut!)) return
      event.preventDefault()
      setOpen((current) => !current)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  })

  function choose(item: CommandPaletteItem) {
    setOpen(false)
    item.onSelect()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl",
          className
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <PaletteBody
          groups={groups}
          search={search}
          searchDebounce={searchDebounce}
          searchMinLength={searchMinLength}
          labels={labels}
          onChoose={choose}
        />
      </DialogContent>
    </Dialog>
  )
}

export interface CommandPaletteTriggerProps extends ComponentProps<
  typeof Button
> {
  /** O mesmo atalho da paleta, só para exibir. */
  shortcut?: string
  label?: string
}

/** Botão de busca para o cabeçalho (ex.: slot `actions` do `app-shell`). */
export function CommandPaletteTrigger({
  shortcut = "mod+k",
  label = DEFAULT_LABELS.triggerLabel,
  className,
  ...props
}: CommandPaletteTriggerProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={label}
      aria-keyshortcuts={shortcut.replace(/\bmod\b/i, "Control")}
      className={cn("gap-2 text-muted-foreground", className)}
      {...props}
    >
      <Icons.search data-icon="inline-start" />
      <span className="hidden sm:inline">{label}</span>
      <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[0.7rem] text-muted-foreground sm:inline">
        {formatShortcut(shortcut)}
      </kbd>
    </Button>
  )
}
