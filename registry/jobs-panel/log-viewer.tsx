import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"

import type { JobsPanelLabels } from "./types"

/** Folga, em px, para ainda contar como “no fim” (arredondamento de rolagem). */
const END_SLACK = 8

export interface LogViewerProps {
  /** Log inteiro; o pai manda o texto novo e o visualizador acompanha. */
  text: string
  name: string
  labels: Pick<
    JobsPanelLabels,
    "logAria" | "noLog" | "copyLog" | "copied" | "followLog"
  >
  className?: string
}

/**
 * Log em fonte mono. Enquanto a pessoa não rolar para cima, a rolagem segue o
 * fim a cada atualização; ao rolar para cima ela para e aparece “Ir para o
 * fim”. A região é focável (rolagem por teclado) e não é `aria-live`: um log
 * que cresce não deve ser lido linha a linha.
 */
export function LogViewer({ text, name, labels, className }: LogViewerProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [following, setFollowing] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const element = scroller.current
    if (following && element) element.scrollTop = element.scrollHeight
  }, [text, following])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  function onScroll() {
    const element = scroller.current
    if (!element) return
    const gap = element.scrollHeight - element.scrollTop - element.clientHeight
    setFollowing(gap <= END_SLACK)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Sem permissão da área de transferência: o botão fica como estava.
    }
  }

  return (
    <div className={cn("relative flex flex-col gap-2", className)}>
      <div className="flex items-center justify-end gap-2">
        {!following ? (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setFollowing(true)}
          >
            <Icons.chevronDown data-icon="inline-start" />
            {labels.followLog}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="xs"
          onClick={copy}
          disabled={text === ""}
        >
          {copied ? (
            <Icons.check data-icon="inline-start" />
          ) : (
            <Icons.copy data-icon="inline-start" />
          )}
          {copied ? labels.copied : labels.copyLog}
        </Button>
      </div>
      <div
        ref={scroller}
        role="region"
        aria-label={labels.logAria(name)}
        tabIndex={0}
        onScroll={onScroll}
        data-slot="log-viewer"
        className="max-h-64 overflow-auto rounded-md border bg-muted/50 p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {text === "" ? (
          <span className="text-muted-foreground">{labels.noLog}</span>
        ) : (
          <pre className="w-max min-w-full whitespace-pre">{text}</pre>
        )}
      </div>
      <span role="status" className="sr-only">
        {copied ? labels.copied : ""}
      </span>
    </div>
  )
}
