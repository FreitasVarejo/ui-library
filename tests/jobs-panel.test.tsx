// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { formatDuration, formatRelative } from "@registry/jobs-panel/format"
import { JobsPanel } from "@registry/jobs-panel/jobs-panel"
import type { Job } from "@registry/jobs-panel/types"

afterEach(cleanup)

const NOW = new Date("2026-03-10T12:00:00Z").getTime()
const ago = (seconds: number) => NOW - seconds * 1000

const JOBS: Job[] = [
  {
    id: "1",
    name: "Indexar contratos",
    status: "running",
    progress: 40,
    startedAt: ago(125),
    log: "linha 1\nlinha 2",
  },
  { id: "2", name: "Extrair texto", status: "queued", queuedAt: ago(30) },
  {
    id: "3",
    name: "Gerar miniaturas",
    status: "succeeded",
    startedAt: ago(900),
    finishedAt: ago(600),
  },
  {
    id: "4",
    name: "Reindexar atas",
    status: "failed",
    startedAt: ago(500),
    finishedAt: ago(440),
    error: "Timeout no OCR",
  },
  {
    id: "5",
    name: "Limpar cache",
    status: "cancelled",
    queuedAt: ago(4000),
    finishedAt: ago(3900),
  },
  {
    id: "6",
    name: "Importar e-mails",
    status: "failed",
    startedAt: ago(70),
    finishedAt: ago(10),
  },
]

const names = () =>
  screen
    .getAllByRole("listitem")
    .filter((li) => li.getAttribute("data-slot") === "job-row")
    .map((li) => within(li).getAllByText(/.+/)[0].textContent)

function renderPanel(
  props: Partial<React.ComponentProps<typeof JobsPanel>> = {}
) {
  return render(<JobsPanel jobs={JOBS} now={NOW} {...props} />)
}

describe("formatação de tempo", () => {
  it("relativo em pt-BR, com “agora” para menos de 5 s", () => {
    expect(formatRelative(NOW - 2000, NOW)).toBe("agora")
    expect(formatRelative(NOW - 125_000, NOW)).toBe("há 2 minutos")
    expect(formatRelative(NOW - 3 * 3600_000, NOW)).toBe("há 3 horas")
  })

  it("duração compacta", () => {
    expect(formatDuration(45_000)).toBe("45 s")
    expect(formatDuration(125_000)).toBe("2 min 5 s")
    expect(formatDuration(120_000)).toBe("2 min")
    expect(formatDuration(3_780_000)).toBe("1 h 3 min")
  })
})

describe("JobsPanel: filtro por status", () => {
  it("mostra a contagem de cada status e filtra a lista", async () => {
    renderPanel()
    const group = screen.getByRole("group", { name: "Filtrar por status" })
    const count = (label: string) =>
      within(group).getByRole("button", { name: new RegExp(`^${label}`) })
        .textContent

    expect(count("Todos")).toBe("Todos6")
    expect(count("Na fila")).toBe("Na fila1")
    expect(count("Rodando")).toBe("Rodando1")
    expect(count("Falhou")).toBe("Falhou2")
    expect(names()).toHaveLength(6)

    await userEvent.click(
      within(group).getByRole("button", { name: /^Falhou/ })
    )
    expect(names()).toEqual(["Reindexar atas", "Importar e-mails"])
    expect(
      within(group)
        .getByRole("button", { name: /^Falhou/ })
        .getAttribute("aria-pressed")
    ).toBe("true")
    // a contagem não muda com o filtro: ela é do total
    expect(count("Todos")).toBe("Todos6")

    await userEvent.click(
      within(group).getByRole("button", { name: /^Concluído/ })
    )
    expect(names()).toEqual(["Gerar miniaturas"])
  })

  it("status sem jobs mostra o vazio do filtro, e “Ver todos” volta", async () => {
    renderPanel({ jobs: JOBS.filter((job) => job.status !== "queued") })
    await userEvent.click(screen.getByRole("button", { name: /^Na fila/ }))
    expect(screen.getByText("Nenhum job com este status")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Ver todos" }))
    expect(names()).toHaveLength(5)
  })

  it("filtro controlado: o pai manda e recebe a mudança", async () => {
    const onFilterChange = vi.fn()
    renderPanel({ filter: "queued", onFilterChange })
    expect(names()).toEqual(["Extrair texto"])
    await userEvent.click(screen.getByRole("button", { name: /^Rodando/ }))
    expect(onFilterChange).toHaveBeenCalledWith("running")
    // controlado: sem o pai trocar a prop, a lista não muda
    expect(names()).toEqual(["Extrair texto"])
  })
})

describe("JobsPanel: ações e dados", () => {
  it("tentar de novo só em falhou e cancelado; cancelar só em fila e rodando", async () => {
    const onRetry = vi.fn()
    const onCancel = vi.fn()
    renderPanel({ onRetry, onCancel })

    expect(
      screen.getAllByRole("button", { name: /^Tentar de novo o job/ })
    ).toHaveLength(3)
    expect(
      screen.getAllByRole("button", { name: /^Cancelar o job/ })
    ).toHaveLength(2)
    expect(
      screen.queryByRole("button", {
        name: "Tentar de novo o job Gerar miniaturas",
      })
    ).toBeNull()

    await userEvent.click(
      screen.getByRole("button", {
        name: "Tentar de novo o job Reindexar atas",
      })
    )
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry.mock.calls[0][0]).toMatchObject({ id: "4" })

    await userEvent.click(
      screen.getByRole("button", { name: "Cancelar o job Indexar contratos" })
    )
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onCancel.mock.calls[0][0]).toMatchObject({ id: "1" })
  })

  it("sem os callbacks não há botões de ação", () => {
    renderPanel()
    expect(
      screen.queryByRole("button", {
        name: /Tentar de novo o job|Cancelar o job/,
      })
    ).toBeNull()
  })

  it("rodando mostra a barra com o progresso; sem progresso fica indeterminada", () => {
    renderPanel({
      jobs: [
        JOBS[0],
        { id: "9", name: "Sem número", status: "running", startedAt: ago(5) },
      ],
    })
    const bars = screen.getAllByRole("progressbar")
    expect(bars[0].getAttribute("aria-valuenow")).toBe("40")
    expect(bars[1].getAttribute("aria-valuenow")).toBeNull()
  })

  it("mostra início e duração relativos ao relógio", () => {
    renderPanel()
    expect(screen.getByText("iniciado há 2 minutos")).toBeTruthy()
    expect(screen.getByText("na fila há 30 segundos")).toBeTruthy()
    expect(screen.getByText("terminou há 10 minutos · 5 min")).toBeTruthy()
    expect(screen.getByText("Timeout no OCR")).toBeTruthy()
  })
})

describe("JobsPanel: estados", () => {
  it("carregando, erro com recarregar e vazio vêm do `states`", async () => {
    const { rerender } = render(
      <JobsPanel jobs={[]} status="loading" now={NOW} />
    )
    expect(screen.getByText("Carregando jobs…")).toBeTruthy()
    expect(
      screen.queryByRole("group", { name: "Filtrar por status" })
    ).toBeNull()

    const onReload = vi.fn()
    rerender(
      <JobsPanel jobs={[]} status="error" onReload={onReload} now={NOW} />
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar de novo" })
    )
    expect(onReload).toHaveBeenCalledTimes(1)

    rerender(<JobsPanel jobs={[]} now={NOW} />)
    expect(screen.getByText("Nenhum job")).toBeTruthy()
  })
})

describe("JobsPanel: anúncio de mudança de estado", () => {
  it("anuncia o job que terminou, sem anunciar o progresso", () => {
    const { rerender, container } = renderPanel()
    const status = container.querySelector('p[role="status"]')!
    expect(status.textContent).toBe("")

    const moved = JOBS.map((job) =>
      job.id === "1" ? { ...job, progress: 70 } : job
    )
    rerender(<JobsPanel jobs={moved} now={NOW} />)
    expect(status.textContent).toBe("")

    const done = moved.map((job) =>
      job.id === "1" ? { ...job, status: "succeeded" as const } : job
    )
    rerender(<JobsPanel jobs={done} now={NOW} />)
    expect(status.textContent).toBe("Indexar contratos: concluído.")

    const many = done.map((job) =>
      job.id === "2" || job.id === "6"
        ? { ...job, status: "cancelled" as const }
        : job
    )
    rerender(<JobsPanel jobs={many} now={NOW} />)
    expect(status.textContent).toBe("2 jobs mudaram de status.")
  })
})

describe("JobsPanel: log expansível", () => {
  function setScroll(
    element: HTMLElement,
    values: { scrollHeight: number; clientHeight: number }
  ) {
    Object.defineProperty(element, "scrollHeight", {
      configurable: true,
      value: values.scrollHeight,
    })
    Object.defineProperty(element, "clientHeight", {
      configurable: true,
      value: values.clientHeight,
    })
  }

  it("fechado não renderiza o log; abrir mostra o texto em mono", async () => {
    renderPanel()
    expect(screen.queryByRole("region", { name: /Log do job/ })).toBeNull()
    const [first] = screen.getAllByRole("button", { name: "Ver log" })
    await userEvent.click(first)
    const log = screen.getByRole("region", {
      name: "Log do job Indexar contratos",
    })
    expect(log.textContent).toBe("linha 1\nlinha 2")
    expect(log.className).toContain("font-mono")
    expect(first.getAttribute("aria-expanded")).toBe("true")
  })

  it("copia o log inteiro para a área de transferência", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    // o userEvent instala o seu próprio clipboard; o espião vai por cima
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText)
    renderPanel()
    await user.click(screen.getAllByRole("button", { name: "Ver log" })[0])
    await user.click(screen.getByRole("button", { name: "Copiar log" }))
    expect(writeText).toHaveBeenCalledWith("linha 1\nlinha 2")
    expect(
      await screen.findByRole("button", { name: "Log copiado" })
    ).toBeTruthy()
  })

  it("segue o fim enquanto a pessoa não rolou; rolar para cima para de seguir", async () => {
    const job = (log: string): Job => ({
      id: "1",
      name: "A",
      status: "running",
      log,
    })
    const { rerender } = render(<JobsPanel jobs={[job("a")]} now={NOW} />)
    await userEvent.click(screen.getByRole("button", { name: "Ver log" }))
    const log = screen.getByRole("region", { name: "Log do job A" })
    setScroll(log, { scrollHeight: 500, clientHeight: 100 })

    // chega texto novo: vai para o fim
    rerender(<JobsPanel jobs={[job("a\nb")]} now={NOW} />)
    expect(log.scrollTop).toBe(500)

    // a pessoa sobe: o painel não puxa mais de volta
    log.scrollTop = 120
    act(() => {
      log.dispatchEvent(new Event("scroll", { bubbles: true }))
    })
    setScroll(log, { scrollHeight: 700, clientHeight: 100 })
    rerender(<JobsPanel jobs={[job("a\nb\nc")]} now={NOW} />)
    expect(log.scrollTop).toBe(120)

    // “Ir para o fim” volta a seguir
    await userEvent.click(screen.getByRole("button", { name: "Ir para o fim" }))
    expect(log.scrollTop).toBe(700)
    setScroll(log, { scrollHeight: 900, clientHeight: 100 })
    rerender(<JobsPanel jobs={[job("a\nb\nc\nd")]} now={NOW} />)
    expect(log.scrollTop).toBe(900)
  })
})
