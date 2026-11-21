import { useRef, useState } from "react"
import type { ChangeEvent, DragEvent } from "react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"

import { useUploadQueue } from "./use-upload-queue"
import { DEFAULT_LABELS, formatBytes } from "./types"
import type { FileUploadLabels, UploadFn, UploadItem } from "./types"

export interface FileUploadProps<Result = unknown> {
  /**
   * Faz o envio de um arquivo. O bloco só chama; rede, endereço e cabeçalhos
   * são do pai. Chame `onProgress(0..100)` e repasse `signal` ao `fetch`/XHR:
   * ele aborta quando a pessoa cancela ou remove o arquivo.
   */
  upload: UploadFn<Result>
  /** Tipos aceitos: `.pdf`, `application/pdf`, `image/*`. Vazio aceita tudo. */
  accept?: string[]
  /** Tamanho máximo por arquivo, em bytes. */
  maxSize?: number
  /** Aceita vários arquivos por vez (padrão `true`). */
  multiple?: boolean
  /** Envios ao mesmo tempo (padrão 2). */
  concurrency?: number
  disabled?: boolean
  onUploaded?: (file: File, result: Result) => void
  labels?: Partial<FileUploadLabels>
  className?: string
}

function StatusText({
  item,
  labels,
}: {
  item: UploadItem
  labels: FileUploadLabels
}) {
  const base = "flex items-center gap-1 text-xs"
  switch (item.status) {
    case "waiting":
      return (
        <span className={cn(base, "text-muted-foreground")}>
          <Icons.clock aria-hidden="true" className="size-3" />
          {labels.waiting}
        </span>
      )
    case "uploading":
      return (
        <span className={cn(base, "text-muted-foreground tabular-nums")}>
          {labels.uploading(Math.round(item.progress))}
        </span>
      )
    case "done":
      return (
        <span className={cn(base, "text-foreground")}>
          <Icons.success aria-hidden="true" className="size-3" />
          {labels.done}
        </span>
      )
    case "cancelled":
      return (
        <span className={cn(base, "text-muted-foreground")}>
          <Icons.stop aria-hidden="true" className="size-3" />
          {labels.cancelled}
        </span>
      )
    case "error":
    case "rejected":
      return (
        <span className={cn(base, "text-destructive")}>
          <Icons.error aria-hidden="true" className="size-3 shrink-0" />
          <span className="min-w-0 break-words">{item.error}</span>
        </span>
      )
  }
}

/**
 * Dropzone e fila de envios. A zona é um `<label>` em volta do campo de
 * arquivo: clique abre o seletor e o teclado chega nele (Tab, depois Enter ou
 * Espaço). O envio é injetado em `upload`; o bloco não faz requisição.
 * Leitor de tela: uma região `status` anuncia a entrada de arquivos e o fim da
 * fila; o andamento em % fica só na barra, sem anúncio a cada passo.
 */
export function FileUpload<Result = unknown>({
  upload,
  accept,
  maxSize,
  multiple = true,
  concurrency = 2,
  disabled = false,
  onUploaded,
  labels: labelsProp,
  className,
}: FileUploadProps<Result>) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const [announcement, setAnnouncement] = useState("")
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const queue = useUploadQueue<Result>({
    upload,
    accept,
    maxSize,
    concurrency,
    labels: labelsProp,
    onUploaded,
    onAnnounce: setAnnouncement,
  })

  function pick(files: Iterable<File>) {
    const list = [...files]
    queue.addFiles(multiple ? list : list.slice(0, 1))
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) pick(event.target.files)
    // Permite escolher o mesmo arquivo de novo depois de removê-lo.
    event.target.value = ""
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (!disabled) pick(event.dataTransfer.files)
  }

  const rules = labels.rules({ accept, maxSize })

  return (
    <div
      data-slot="file-upload"
      className={cn("flex min-w-0 flex-col gap-4", className)}
    >
      <label
        data-slot="file-upload-dropzone"
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false)
        }}
        onDrop={onDrop}
        className={cn(
          "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card p-6 text-center text-card-foreground transition-colors hover:bg-muted/50 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50 data-[dragging]:border-primary data-[dragging]:bg-muted",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icons.upload aria-hidden="true" className="size-5" />
        </span>
        <span className="text-sm font-medium">
          {dragging ? labels.dropzoneActive : labels.dropzoneTitle}
        </span>
        {rules ? (
          <span className="text-xs text-muted-foreground">{rules}</span>
        ) : null}
        <input
          ref={input}
          type="file"
          className="sr-only"
          multiple={multiple}
          disabled={disabled}
          accept={accept && accept.length > 0 ? accept.join(",") : undefined}
          onChange={onChange}
        />
      </label>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {queue.items.length > 0 ? (
        <ul aria-label={labels.queueAria} className="flex flex-col gap-2">
          {queue.items.map((item) => {
            const name = item.file.name
            const active =
              item.status === "waiting" || item.status === "uploading"
            return (
              <li
                key={item.id}
                data-status={item.status}
                className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground"
              >
                <div className="flex items-start gap-3">
                  <Icons.file
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">
                        {name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>
                    <StatusText item={item} labels={labels} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {active ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={labels.cancel(name)}
                        onClick={() => queue.cancel(item.id)}
                      >
                        <Icons.close />
                      </Button>
                    ) : null}
                    {item.status === "error" || item.status === "cancelled" ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={labels.retry(name)}
                        onClick={() => queue.retry(item.id)}
                      >
                        <Icons.retry />
                      </Button>
                    ) : null}
                    {!active ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={labels.remove(name)}
                        onClick={() => queue.remove(item.id)}
                      >
                        <Icons.close />
                      </Button>
                    ) : null}
                  </div>
                </div>
                {item.status === "uploading" ? (
                  <Progress
                    value={item.progress}
                    aria-label={labels.progressAria(name)}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
