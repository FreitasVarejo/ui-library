// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { splitByRanges } from "@registry/search-results/highlight"
import { HighlightedText } from "@registry/search-results/highlighted-text"
import { SearchResults } from "@registry/search-results/search-results"
import type { SearchResultsProps } from "@registry/search-results/search-results"
import type { SearchResultItem } from "@registry/search-results/types"

afterEach(cleanup)

describe("splitByRanges", () => {
  it("parte o texto nas faixas", () => {
    expect(splitByRanges("contrato de serviço", [[0, 8]])).toEqual([
      { text: "contrato", highlighted: true },
      { text: " de serviço", highlighted: false },
    ])
  })

  it("une faixas que se cruzam ou se tocam e ordena as fora de ordem", () => {
    expect(
      splitByRanges("abcdefghij", [
        [6, 8],
        [0, 3],
        [2, 5],
        [5, 6],
      ])
    ).toEqual([
      { text: "abcdefgh", highlighted: true },
      { text: "ij", highlighted: false },
    ])
  })

  it("corta o que passa do texto e ignora faixas vazias, invertidas ou inválidas", () => {
    expect(
      splitByRanges("abc", [
        [-5, 1],
        [2, 99],
        [1, 1],
        [3, 2],
        [Number.NaN, 2],
      ])
    ).toEqual([
      { text: "a", highlighted: true },
      { text: "b", highlighted: false },
      { text: "c", highlighted: true },
    ])
  })

  it("sem faixas devolve o texto inteiro; texto vazio, nada", () => {
    expect(splitByRanges("abc")).toEqual([{ text: "abc", highlighted: false }])
    expect(splitByRanges("", [[0, 3]])).toEqual([])
  })
})

describe("HighlightedText: nunca HTML cru", () => {
  const evil = 'x <img src=x onerror="window.pwned=1"> <script>1</script> y'

  it("marca só as faixas e mantém o resto como texto", () => {
    const { container } = render(
      <p>
        <HighlightedText text="contrato de serviço" ranges={[[0, 8]]} />
      </p>
    )
    const marks = container.querySelectorAll("mark")
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe("contrato")
    expect(container.textContent).toBe("contrato de serviço")
  })

  it("tags no trecho aparecem como texto, sem criar elementos", () => {
    const { container } = render(
      <p>
        <HighlightedText text={evil} ranges={[[2, 22]]} />
      </p>
    )
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("script")).toBeNull()
    // o texto literal está lá, inclusive dentro do <mark>
    expect(container.textContent).toBe(evil)
    expect(container.querySelector("mark")?.textContent).toBe(evil.slice(2, 22))
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined()
  })

  it("faixa que tenta fechar o mark e abrir tag não vira HTML", () => {
    const { container } = render(
      <p>
        <HighlightedText text="a</mark><b>negrito</b>" ranges={[[1, 8]]} />
      </p>
    )
    expect(container.querySelector("b")).toBeNull()
    expect(container.querySelectorAll("mark")).toHaveLength(1)
  })
})

const RESULTS: SearchResultItem[] = [
  {
    id: "1",
    title: "Contrato de serviço",
    titleHighlights: [[0, 8]],
    href: "/docs/1",
    snippet: "O prazo de vigência do contrato é de doze meses.",
    highlights: [[23, 31]],
    meta: [
      { label: "Tipo", value: "PDF" },
      { label: "Autor", value: "Ana Souza" },
    ],
  },
  { id: "2", title: "Ata da reunião", href: "/docs/2" },
]

function setup(props: Partial<SearchResultsProps> = {}) {
  const onSearch = vi.fn()
  const onFacetsChange = vi.fn()
  render(
    <SearchResults
      query="contrato"
      onSearch={onSearch}
      status="ready"
      results={RESULTS}
      total={2}
      facets={[
        {
          id: "type",
          label: "Tipo",
          options: [
            { value: "PDF", count: 5 },
            { value: "DOCX", count: 2 },
          ],
        },
      ]}
      selectedFacets={{}}
      onFacetsChange={onFacetsChange}
      {...props}
    />
  )
  return { onSearch, onFacetsChange }
}

describe("SearchResults", () => {
  it("mostra contagem, título como link, trecho destacado e metadados", () => {
    setup()
    expect(screen.getByText("2 resultados para “contrato”")).toBeTruthy()
    const link = screen.getByRole("link", { name: /Contrato\s*de serviço/ })
    expect(link.getAttribute("href")).toBe("/docs/1")
    const marks = document.querySelectorAll("mark")
    expect([...marks].map((mark) => mark.textContent)).toEqual([
      "Contrato",
      "contrato",
    ])
    expect(screen.getByText("Ana Souza")).toBeTruthy()
  })

  it("usa o componente de link injetado", () => {
    const Link = ({ href, ...props }: { href: string }) => (
      <a data-router-link href={href} {...props} />
    )
    setup({ linkComponent: Link })
    expect(
      document.querySelectorAll("a[data-router-link]").length
    ).toBeGreaterThan(0)
  })

  it("enviar o campo chama onSearch com o termo digitado", async () => {
    const { onSearch } = setup()
    const input = screen.getByRole("searchbox", { name: "Buscar" })
    await userEvent.clear(input)
    await userEvent.type(input, "ata{Enter}")
    expect(onSearch).toHaveBeenCalledWith("ata")
  })

  it("faceta marcada vai para onFacetsChange somando ao que já havia", async () => {
    const { onFacetsChange } = setup({ selectedFacets: { type: ["PDF"] } })
    const aside = screen.getByRole("complementary", { name: "Filtros" })
    await userEvent.click(within(aside).getByRole("checkbox", { name: /DOCX/ }))
    expect(onFacetsChange).toHaveBeenCalledWith({ type: ["PDF", "DOCX"] })
    expect(within(aside).getByText("5")).toBeTruthy()
  })

  it("no celular os filtros abrem num Sheet com as mesmas facetas", async () => {
    const { onFacetsChange } = setup()
    await userEvent.click(screen.getByRole("button", { name: "Filtros" }))
    const sheet = await screen.findByRole("dialog")
    expect(
      within(sheet).getByText("Refine os resultados da busca.")
    ).toBeTruthy()
    await userEvent.click(within(sheet).getByRole("checkbox", { name: /PDF/ }))
    expect(onFacetsChange).toHaveBeenCalledWith({ type: ["PDF"] })
    expect(
      within(sheet).getByRole("button", { name: "Ver 2 resultados" })
    ).toBeTruthy()
  })

  it("ordenação: mostra as opções e avisa a escolhida", async () => {
    const onSortChange = vi.fn()
    setup({
      sortOptions: [
        { value: "relevance", label: "Relevância" },
        { value: "recent", label: "Mais recentes" },
      ],
      sort: "relevance",
      onSortChange,
    })
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(
      await screen.findByRole("option", { name: "Mais recentes" })
    )
    expect(onSortChange).toHaveBeenCalledWith("recent")
  })

  it("estado sem busca ainda", () => {
    setup({ status: "idle", query: "", results: [] })
    expect(screen.getByText("Busque no acervo")).toBeTruthy()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("estado carregando é anunciado", () => {
    setup({ status: "loading" })
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true")
  })

  it("sem resultado com filtro ativo sugere limpar os filtros", async () => {
    const { onFacetsChange } = setup({
      results: [],
      selectedFacets: { type: ["PDF"] },
    })
    expect(screen.getByText("Nenhum resultado")).toBeTruthy()
    const buttons = screen.getAllByRole("button", { name: "Limpar filtros" })
    await userEvent.click(buttons[buttons.length - 1])
    expect(onFacetsChange).toHaveBeenCalledWith({})
  })

  it("sem resultado e sem filtro cita o termo e não oferece limpar", () => {
    setup({ results: [], selectedFacets: {} })
    expect(screen.getByText(/Nada encontrado para “contrato”/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()
  })

  it("erro oferece tentar de novo", async () => {
    const onRetry = vi.fn()
    setup({ status: "error", onRetry })
    expect(screen.getByRole("alert")).toBeTruthy()
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar de novo" })
    )
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
