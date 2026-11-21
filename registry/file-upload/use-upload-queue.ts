import { useCallback, useEffect, useRef, useState } from "react"

import { DEFAULT_LABELS, formatBytes } from "./types"
import type { FileRules, FileUploadLabels, UploadFn, UploadItem } from "./types"
import { validateFile } from "./validate"

export interface UseUploadQueueOptions<Result> extends FileRules {
  upload: UploadFn<Result>
  /** Envios ao mesmo tempo. O resto espera em `waiting`. Padrão 2. */
  concurrency?: number
  labels?: Partial<FileUploadLabels>
  /** Chamado quando um arquivo termina com sucesso. */
  onUploaded?: (file: File, result: Result) => void
  /** Chamado com cada anúncio para leitor de tela (ver `file-upload.tsx`). */
  onAnnounce?: (message: string) => void
}

export interface UploadQueue<Result> {
  items: UploadItem<Result>[]
  /** Valida e enfileira; os válidos começam a enviar sozinhos. */
  addFiles: (files: Iterable<File>) => void
  /** Aguardando ou enviando: aborta o `signal` e marca `cancelled`. */
  cancel: (id: string) => void
  /** Erro ou cancelado: volta para a fila do começo. */
  retry: (id: string) => void
  /** Tira da lista; se estiver enviando, cancela antes. */
  remove: (id: string) => void
}

const isActive = (item: UploadItem<unknown>) =>
  item.status === "waiting" || item.status === "uploading"

/**
 * Fila de envios com limite de simultâneos. Não conhece rede: o `upload` vem
 * do pai. O estado fica numa referência atualizada de forma síncrona, para
 * que o agendador enxergue sempre a fila mais nova, sem efeitos em cadeia.
 */
export function useUploadQueue<Result = unknown>({
  upload,
  concurrency = 2,
  accept,
  maxSize,
  labels: labelsProp,
  onUploaded,
  onAnnounce,
}: UseUploadQueueOptions<Result>): UploadQueue<Result> {
  const [items, setItems] = useState<UploadItem<Result>[]>([])
  const itemsRef = useRef<UploadItem<Result>[]>([])
  const controllers = useRef(new Map<string, AbortController>())
  const nextId = useRef(0)
  const mounted = useRef(true)
  const active = useRef(false)

  // Última versão das props, lida pelos callbacks de longa duração.
  const latest = useRef({
    upload,
    concurrency,
    labelsProp,
    onUploaded,
    onAnnounce,
  })
  useEffect(() => {
    latest.current = { upload, concurrency, labelsProp, onUploaded, onAnnounce }
  })

  const commit = useCallback(
    (update: (current: UploadItem<Result>[]) => UploadItem<Result>[]) => {
      itemsRef.current = update(itemsRef.current)
      if (mounted.current) setItems(itemsRef.current)
    },
    []
  )

  const patch = useCallback(
    (id: string, changes: Partial<UploadItem<Result>>) =>
      commit((current) =>
        current.map((item) => (item.id === id ? { ...item, ...changes } : item))
      ),
    [commit]
  )

  const announceIfFinished = useCallback(() => {
    const current = itemsRef.current
    if (!active.current || current.some(isActive)) return
    active.current = false
    const count = (status: UploadItem["status"]) =>
      current.filter((item) => item.status === status).length
    const labels = { ...DEFAULT_LABELS, ...latest.current.labelsProp }
    latest.current.onAnnounce?.(
      labels.finished(count("done"), count("error"), count("cancelled"))
    )
  }, [])

  const pump = useCallback(
    function pump() {
      const { upload: send, concurrency: limit } = latest.current
      const running = () =>
        itemsRef.current.filter((item) => item.status === "uploading").length
      for (const item of itemsRef.current) {
        if (running() >= Math.max(1, limit)) break
        if (item.status !== "waiting") continue

        const controller = new AbortController()
        controllers.current.set(item.id, controller)
        patch(item.id, { status: "uploading", progress: 0, error: undefined })

        const current = () => controllers.current.get(item.id) === controller
        const onProgress = (percent: number) => {
          if (!current() || controller.signal.aborted) return
          if (!Number.isFinite(percent)) return
          patch(item.id, { progress: Math.min(100, Math.max(0, percent)) })
        }

        send(item.file, { onProgress, signal: controller.signal }).then(
          (result) => {
            if (!current() || controller.signal.aborted) return
            controllers.current.delete(item.id)
            patch(item.id, { status: "done", progress: 100, result })
            latest.current.onUploaded?.(item.file, result)
            pump()
            announceIfFinished()
          },
          (reason: unknown) => {
            if (!current() || controller.signal.aborted) return
            controllers.current.delete(item.id)
            const labels = { ...DEFAULT_LABELS, ...latest.current.labelsProp }
            patch(item.id, {
              status: "error",
              error:
                reason instanceof Error && reason.message
                  ? reason.message
                  : labels.uploadFailed,
            })
            pump()
            announceIfFinished()
          }
        )
      }
    },
    [announceIfFinished, patch]
  )

  // Mudar `concurrency` com a fila andando libera (ou segura) vagas.
  useEffect(() => {
    pump()
  }, [concurrency, pump])

  useEffect(() => {
    mounted.current = true
    const pending = controllers.current
    return () => {
      mounted.current = false
      pending.forEach((controller) => controller.abort())
      pending.clear()
    }
  }, [])

  const addFiles = useCallback(
    (files: Iterable<File>) => {
      const labels = { ...DEFAULT_LABELS, ...latest.current.labelsProp }
      const added: UploadItem<Result>[] = []
      let rejected = 0
      for (const file of files) {
        const reason = validateFile(file, { accept, maxSize })
        const item: UploadItem<Result> = {
          id: `upload-${nextId.current++}`,
          file,
          status: reason ? "rejected" : "waiting",
          progress: 0,
        }
        if (reason === "type") item.error = labels.typeNotAccepted(accept ?? [])
        if (reason === "size")
          item.error = labels.tooLarge(
            formatBytes(file.size),
            formatBytes(maxSize ?? 0)
          )
        if (reason) rejected++
        added.push(item)
      }
      if (added.length === 0) return
      if (added.length > rejected) active.current = true
      commit((current) => [...current, ...added])
      latest.current.onAnnounce?.(
        labels.added(added.length - rejected, rejected)
      )
      pump()
    },
    [accept, commit, maxSize, pump]
  )

  const cancel = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((entry) => entry.id === id)
      if (!item || !isActive(item)) return
      controllers.current.get(id)?.abort()
      controllers.current.delete(id)
      patch(id, { status: "cancelled", progress: 0 })
      pump()
      announceIfFinished()
    },
    [announceIfFinished, patch, pump]
  )

  const retry = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((entry) => entry.id === id)
      if (!item || (item.status !== "error" && item.status !== "cancelled"))
        return
      active.current = true
      patch(id, { status: "waiting", progress: 0, error: undefined })
      pump()
    },
    [patch, pump]
  )

  const remove = useCallback(
    (id: string) => {
      controllers.current.get(id)?.abort()
      controllers.current.delete(id)
      commit((current) => current.filter((item) => item.id !== id))
      pump()
      announceIfFinished()
    },
    [announceIfFinished, commit, pump]
  )

  return { items, addFiles, cancel, retry, remove }
}
