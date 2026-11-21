import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { JobsPanel } from "@registry/jobs-panel/jobs-panel"
import type { Job } from "@registry/jobs-panel/types"
import { Section, Specimen } from "../section"

const MINUTE = 60_000

function logLines(count: number, last?: string) {
  const lines = Array.from(
    { length: count },
    (_, index) =>
      `[${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}] processando lote ${index + 1} de ${count + 20}… ok`
  )
  if (last) lines.push(last)
  return lines
}

function initialJobs(now: number): Job[] {
  return [
    {
      id: "j1",
      name: "Indexar acervo de contratos",
      description: "1.240 documentos, OCR ligado",
      status: "running",
      progress: 42,
      startedAt: now - 3 * MINUTE,
      log: logLines(48),
    },
    {
      id: "j2",
      name: "Extrair texto de PDFs digitalizados",
      status: "queued",
      queuedAt: now - 40_000,
    },
    {
      id: "j3",
      name: "Gerar miniaturas",
      status: "succeeded",
      startedAt: now - 25 * MINUTE,
      finishedAt: now - 21 * MINUTE,
      log: logLines(6, "concluído sem erros"),
    },
    {
      id: "j4",
      name: "Reindexar atas de reunião",
      status: "failed",
      startedAt: now - 12 * MINUTE,
      finishedAt: now - 11 * MINUTE,
      error: "Tempo esgotado no serviço de OCR (30 s).",
      log: logLines(9, "ERRO: timeout ao chamar o serviço de OCR"),
    },
    {
      id: "j5",
      name: "Limpar cache de buscas",
      status: "cancelled",
      queuedAt: now - 70 * MINUTE,
      finishedAt: now - 69 * MINUTE,
    },
    {
      id: "j6",
      name: "Importar e-mails de março",
      status: "queued",
      queuedAt: now - 5_000,
    },
  ]
}

function LiveJobs() {
  const [jobs, setJobs] = useState(() => initialJobs(Date.now()))
  const [simulating, setSimulating] = useState(false)

  // O pai é quem atualiza: aqui, um relógio de mentira empurra o progresso.
  useEffect(() => {
    if (!simulating) return
    const timer = setInterval(() => {
      setJobs((current) =>
        current.map((job, index) => {
          if (job.status !== "running") return job
          const progress = Math.min(100, (job.progress ?? 0) + 6)
          const log = [
            ...(Array.isArray(job.log) ? job.log : []),
            `processando lote ${index * 100 + progress}… ok`,
          ]
          return progress >= 100
            ? {
                ...job,
                status: "succeeded",
                progress,
                finishedAt: Date.now(),
                log: [...log, "concluído sem erros"],
              }
            : { ...job, progress, log }
        })
      )
    }, 800)
    return () => clearInterval(timer)
  }, [simulating])

  const update = (id: string, changes: Partial<Job>) =>
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, ...changes } : job))
    )

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          size="sm"
          variant="outline"
          aria-pressed={simulating}
          onClick={() => setSimulating((value) => !value)}
        >
          {simulating ? "Parar simulação" : "Simular andamento"}
        </Button>
      </div>
      <JobsPanel
        jobs={jobs}
        onRetry={(job) =>
          update(job.id, {
            status: "queued",
            queuedAt: Date.now(),
            error: undefined,
          })
        }
        onCancel={(job) =>
          update(job.id, { status: "cancelled", finishedAt: Date.now() })
        }
      />
    </div>
  )
}

export function JobsPanelPage() {
  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Painel ao vivo"
        description="Filtre por status (a contagem é do total), tente de novo um job que falhou, cancele um da fila e abra o log: ele segue o fim até você rolar para cima. “Simular andamento” faz o pai atualizar os dados."
      >
        <LiveJobs />
      </Section>

      <Section title="Estados" description="Vêm do bloco states.">
        <div className="grid gap-4 md:grid-cols-3">
          <Specimen label="carregando">
            <JobsPanel jobs={[]} status="loading" />
          </Specimen>
          <Specimen label="vazio">
            <JobsPanel jobs={[]} />
          </Specimen>
          <Specimen label="erro">
            <JobsPanel jobs={[]} status="error" onReload={() => undefined} />
          </Specimen>
        </div>
      </Section>
    </div>
  )
}
