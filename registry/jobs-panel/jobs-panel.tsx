import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { EmptyState, ErrorState, LoadingState } from "@/components/states"
import { cn } from "@/lib/utils"

import { toMillis } from "./format"
import { JobRow } from "./job-row"
import { DEFAULT_LABELS } from "./types"
import type {
  Job,
  JobFilter,
  JobStatus,
  JobsPanelLabels,
  JobsPanelStatus,
  Timestamp,
} from "./types"
import { useControllable } from "./use-controllable"

export const JOB_STATUSES: JobStatus[] = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]

const FINAL: JobStatus[] = ["succeeded", "failed", "cancelled"]

export interface JobsPanelProps {
  /** Os jobs, na ordem em que aparecem. O pai atualiza; o painel só mostra. */
  jobs: Job[]
  /** `loading` e `error` usam os estados do `states`. Padrão `ready`. */
  status?: JobsPanelStatus
  /** Falha ao carregar: botão de tentar de novo. */
  onReload?: () => void
  /** Filtro por status; sem `filter` o painel guarda o seu. */
  filter?: JobFilter
  onFilterChange?: (filter: JobFilter) => void
  /** Com a função, jobs `failed` e `cancelled` ganham “Tentar de novo”. */
  onRetry?: (job: Job) => void
  /** Com a função, jobs `queued` e `running` ganham “Cancelar”. */
  onCancel?: (job: Job) => void
  /** Relógio fixo (testes, capturas). Sem ele o painel usa a hora atual. */
  now?: Timestamp
  /** Ms entre atualizações dos tempos relativos; 0 desliga (padrão 5000). */
  refreshInterval?: number
  labels?: Partial<JobsPanelLabels>
  className?: string
}

/**
 * Painel de jobs em segundo plano: filtro por status com contagem, tempo
 * relativo, ações por callback e log expansível. Os dados são props; o painel
 * não busca nem consulta nada. Mudanças para um estado final são anunciadas
 * numa região `status`, sem anunciar o andamento.
 */
export function JobsPanel({
  jobs,
  status = "ready",
  onReload,
  filter: filterProp,
  onFilterChange,
  onRetry,
  onCancel,
  now: nowProp,
  refreshInterval = 5000,
  labels: labelsProp,
  className,
}: JobsPanelProps) {
  const labels: JobsPanelLabels = {
    ...DEFAULT_LABELS,
    ...labelsProp,
    statuses: { ...DEFAULT_LABELS.statuses, ...labelsProp?.statuses },
  }
  const [filter, setFilter] = useControllable<JobFilter>(
    filterProp,
    onFilterChange,
    "all"
  )

  const [clock, setClock] = useState(() => Date.now())
  useEffect(() => {
    if (nowProp !== undefined || refreshInterval <= 0) return
    const timer = setInterval(() => setClock(Date.now()), refreshInterval)
    return () => clearInterval(timer)
  }, [nowProp, refreshInterval])
  const now = toMillis(nowProp) ?? clock

  // Anúncio das mudanças de estado: comparado na renderização, sem efeito.
  const [seenJobs, setSeenJobs] = useState(jobs)
  const [announcement, setAnnouncement] = useState("")
  if (jobs !== seenJobs) {
    setSeenJobs(jobs)
    const before = new Map(seenJobs.map((job) => [job.id, job.status]))
    const changed = jobs.filter((job) => {
      const previous = before.get(job.id)
      return (
        previous !== undefined &&
        previous !== job.status &&
        FINAL.includes(job.status)
      )
    })
    if (changed.length === 1)
      setAnnouncement(
        labels.announceChange(
          changed[0].name,
          labels.statuses[changed[0].status]
        )
      )
    else if (changed.length > 1)
      setAnnouncement(labels.announceMany(changed.length))
  }

  const counts = JOB_STATUSES.reduce(
    (acc, value) => ({
      ...acc,
      [value]: jobs.filter((job) => job.status === value).length,
    }),
    {} as Record<JobStatus, number>
  )
  const visible =
    filter === "all" ? jobs : jobs.filter((job) => job.status === filter)

  let body
  if (status === "loading") {
    body = <LoadingState variant="list" label={labels.loading} />
  } else if (status === "error") {
    body = (
      <ErrorState
        title={labels.errorTitle}
        description={labels.errorDescription}
        onRetry={onReload}
        retryLabel={labels.reload}
      />
    )
  } else if (jobs.length === 0) {
    body = (
      <EmptyState
        title={labels.emptyTitle}
        description={labels.emptyDescription}
      />
    )
  } else if (visible.length === 0) {
    body = (
      <EmptyState
        title={labels.emptyFilterTitle}
        description={labels.emptyFilterDescription}
        action={
          <Button variant="outline" onClick={() => setFilter("all")}>
            {labels.showAll}
          </Button>
        }
      />
    )
  } else {
    body = (
      <ul aria-label={labels.listAria} className="flex flex-col gap-2">
        {visible.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            labels={labels}
            now={now}
            onRetry={onRetry}
            onCancel={onCancel}
          />
        ))}
      </ul>
    )
  }

  const options: Array<{ value: JobFilter; label: string; count: number }> = [
    { value: "all", label: labels.all, count: jobs.length },
    ...JOB_STATUSES.map((value) => ({
      value,
      label: labels.statuses[value],
      count: counts[value],
    })),
  ]

  return (
    <div
      data-slot="jobs-panel"
      className={cn("flex min-w-0 flex-col gap-4", className)}
    >
      {status === "ready" && jobs.length > 0 ? (
        <div
          role="group"
          aria-label={labels.filterAria}
          className="flex flex-wrap gap-1.5"
        >
          {options.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={filter === option.value ? "default" : "outline"}
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
              <span className="tabular-nums opacity-80">{option.count}</span>
            </Button>
          ))}
        </div>
      ) : null}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div aria-busy={status === "loading"} className="min-w-0">
        {body}
      </div>
    </div>
  )
}
