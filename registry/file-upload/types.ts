/**
 * Estado de um arquivo na fila.
 * `rejected`: não passou na validação de tipo ou tamanho e nunca foi enviado.
 */
export type UploadStatus =
  "waiting" | "uploading" | "done" | "error" | "cancelled" | "rejected"

export interface UploadContext {
  /** Informe o andamento de 0 a 100. Fora da faixa é cortado. */
  onProgress: (percent: number) => void
  /** Dispara quando a pessoa cancela ou remove o arquivo; repasse ao `fetch`/XHR. */
  signal: AbortSignal
}

/** Envio injetado pelo pai: o bloco não conhece rede nem endereço. */
export type UploadFn<Result = unknown> = (
  file: File,
  context: UploadContext
) => Promise<Result>

export interface UploadItem<Result = unknown> {
  id: string
  file: File
  status: UploadStatus
  /** 0 a 100; só faz sentido em `uploading`. */
  progress: number
  /** Mensagem em `error` (falha do envio) e `rejected` (validação). */
  error?: string
  /** O que o `upload` devolveu, em `done`. */
  result?: Result
}

export interface FileRules {
  /**
   * Tipos aceitos, como no atributo `accept`: extensões (`.pdf`), tipos MIME
   * (`application/pdf`) ou curinga (`image/*`). Vazio ou ausente aceita tudo.
   */
  accept?: string[]
  /** Tamanho máximo, em bytes. */
  maxSize?: number
}

export interface FileUploadLabels {
  dropzoneTitle: string
  dropzoneHint: string
  dropzoneActive: string
  /** Texto que descreve as regras, abaixo do título. `undefined` esconde a linha. */
  rules: (rules: FileRules) => string | undefined
  queueAria: string
  waiting: string
  uploading: (percent: number) => string
  done: string
  cancelled: string
  typeNotAccepted: (accept: string[]) => string
  tooLarge: (size: string, max: string) => string
  uploadFailed: string
  cancel: (name: string) => string
  retry: (name: string) => string
  remove: (name: string) => string
  progressAria: (name: string) => string
  /** Anúncio ao adicionar arquivos. */
  added: (accepted: number, rejected: number) => string
  /** Anúncio quando a fila esvazia depois de trabalhar. */
  finished: (done: number, failed: number, cancelled: number) => string
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

export const DEFAULT_LABELS: FileUploadLabels = {
  dropzoneTitle: "Arraste arquivos aqui ou escolha no computador",
  dropzoneHint: "Solte para enviar",
  dropzoneActive: "Solte os arquivos para adicioná-los à fila",
  rules: ({ accept, maxSize }) => {
    const parts: string[] = []
    if (accept && accept.length > 0) parts.push(`Tipos: ${accept.join(", ")}`)
    if (maxSize !== undefined) parts.push(`até ${formatBytes(maxSize)}`)
    return parts.length > 0 ? `${parts.join("; ")}.` : undefined
  },
  queueAria: "Arquivos para enviar",
  waiting: "Aguardando",
  uploading: (percent) => `Enviando ${percent}%`,
  done: "Concluído",
  cancelled: "Cancelado",
  typeNotAccepted: (accept) => `Tipo não aceito. Use: ${accept.join(", ")}.`,
  tooLarge: (size, max) => `Arquivo de ${size}; o máximo é ${max}.`,
  uploadFailed: "O envio falhou.",
  cancel: (name) => `Cancelar o envio de ${name}`,
  retry: (name) => `Tentar de novo ${name}`,
  remove: (name) => `Remover ${name} da lista`,
  progressAria: (name) => `Progresso do envio de ${name}`,
  added: (accepted, rejected) => {
    const parts: string[] = []
    if (accepted > 0)
      parts.push(
        `${plural(accepted, "arquivo adicionado", "arquivos adicionados")}`
      )
    if (rejected > 0) parts.push(`${plural(rejected, "recusado", "recusados")}`)
    return `${parts.join("; ")}.`
  },
  finished: (done, failed, cancelled) => {
    const parts = [plural(done, "enviado", "enviados")]
    if (failed > 0) parts.push(plural(failed, "com erro", "com erro"))
    if (cancelled > 0) parts.push(plural(cancelled, "cancelado", "cancelados"))
    return `Envios terminados: ${parts.join(", ")}.`
  },
}

/** Tamanho legível: 1,5 MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB", "TB"]
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const text = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value)
  return `${text} ${units[unit]}`
}
