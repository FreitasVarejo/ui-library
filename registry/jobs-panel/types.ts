export type JobStatus =
  "queued" | "running" | "succeeded" | "failed" | "cancelled"

/** Instante: `Date`, milissegundos desde a época ou texto ISO 8601. */
export type Timestamp = Date | number | string

export interface Job {
  id: string
  name: string
  description?: string
  status: JobStatus
  /** 0 a 100, em `running`. Sem valor, a barra fica indeterminada. */
  progress?: number
  queuedAt?: Timestamp
  startedAt?: Timestamp
  finishedAt?: Timestamp
  /** Mensagem de erro curta, em `failed`. */
  error?: string
  /** Log do job: texto ou linhas. O pai atualiza; o visualizador acompanha. */
  log?: string | string[]
}

export type JobsPanelStatus = "ready" | "loading" | "error"

/** `"all"` mostra todos. */
export type JobFilter = JobStatus | "all"

export interface JobsPanelLabels {
  filterAria: string
  all: string
  statuses: Record<JobStatus, string>
  retry: string
  cancel: string
  retryAria: (name: string) => string
  cancelAria: (name: string) => string
  showLog: string
  hideLog: string
  noLog: string
  logAria: (name: string) => string
  copyLog: string
  copied: string
  followLog: string
  queuedSince: (relative: string) => string
  startedSince: (relative: string) => string
  finishedSince: (relative: string, duration: string) => string
  progressAria: (name: string) => string
  listAria: string
  loading: string
  emptyTitle: string
  emptyDescription: string
  emptyFilterTitle: string
  emptyFilterDescription: string
  showAll: string
  errorTitle: string
  errorDescription: string
  reload: string
  /** Anúncio quando alguns jobs mudam para um estado final. */
  announceChange: (job: string, status: string) => string
  announceMany: (count: number) => string
}

export const DEFAULT_LABELS: JobsPanelLabels = {
  filterAria: "Filtrar por status",
  all: "Todos",
  statuses: {
    queued: "Na fila",
    running: "Rodando",
    succeeded: "Concluído",
    failed: "Falhou",
    cancelled: "Cancelado",
  },
  retry: "Tentar de novo",
  cancel: "Cancelar",
  retryAria: (name) => `Tentar de novo o job ${name}`,
  cancelAria: (name) => `Cancelar o job ${name}`,
  showLog: "Ver log",
  hideLog: "Ocultar log",
  noLog: "Sem saída até agora.",
  logAria: (name) => `Log do job ${name}`,
  copyLog: "Copiar log",
  copied: "Log copiado",
  followLog: "Ir para o fim",
  queuedSince: (relative) => `na fila ${relative}`,
  startedSince: (relative) => `iniciado ${relative}`,
  finishedSince: (relative, duration) => `terminou ${relative} · ${duration}`,
  progressAria: (name) => `Progresso do job ${name}`,
  listAria: "Jobs",
  loading: "Carregando jobs…",
  emptyTitle: "Nenhum job",
  emptyDescription:
    "Quando houver trabalho em segundo plano, ele aparece aqui.",
  emptyFilterTitle: "Nenhum job com este status",
  emptyFilterDescription: "Escolha outro status para ver os demais.",
  showAll: "Ver todos",
  errorTitle: "Não foi possível carregar os jobs",
  errorDescription: "Tente de novo em instantes.",
  reload: "Tentar de novo",
  announceChange: (job, status) => `${job}: ${status.toLowerCase()}.`,
  announceMany: (count) => `${count} jobs mudaram de status.`,
}
