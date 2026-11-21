// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createColumnHelper } from "@tanstack/react-table"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DataTable } from "@registry/data-table/data-table"
import type { DataTableFeatures } from "@registry/data-table/features"
import { matchesFacet, matchesSearch } from "@registry/data-table/filters"
import type { DataTableBulkAction } from "@registry/data-table/types"

afterEach(cleanup)

interface Doc {
  id: string
  title: string
  type: string
  pages: number
}

const DOCS: Doc[] = [
  { id: "a", title: "Reunião de março", type: "DOCX", pages: 3 },
  { id: "b", title: "Contrato de serviço", type: "PDF", pages: 12 },
  { id: "c", title: "Manual do usuário", type: "PDF", pages: 84 },
  { id: "d", title: "Orçamento anual", type: "Planilha", pages: 5 },
]

const helper = createColumnHelper<DataTableFeatures, Doc>()
const columns = helper.columns([
  helper.accessor("title", { header: "Documento" }),
  helper.accessor("type", { header: "Tipo" }),
  helper.accessor("pages", { header: "Páginas" }),
])

/** Títulos das linhas de dados, na ordem em que aparecem. */
function titles() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell").at(-3)?.textContent ?? "")
}

describe("filtros puros", () => {
  it("a busca ignora acento e caixa e exige todas as palavras", () => {
    expect(matchesSearch("Reunião de Março", "reuniao")).toBe(true)
    expect(matchesSearch("Reunião de Março", "marco reuniao")).toBe(true)
    expect(matchesSearch("Reunião de Março", "contrato")).toBe(false)
    expect(matchesSearch("qualquer", "   ")).toBe(true)
  })

  it("faceta casa o valor exato, não um pedaço dele", () => {
    expect(matchesFacet("PDF", ["PDF"])).toBe(true)
    expect(matchesFacet("PDFA", ["PDF"])).toBe(false)
    expect(matchesFacet("DOCX", [])).toBe(true)
  })
})

describe("DataTable, modo client", () => {
  it("busca textual filtra as linhas, sem acento", async () => {
    render(<DataTable columns={columns} data={DOCS} />)
    expect(titles()).toHaveLength(4)
    await userEvent.type(screen.getByRole("searchbox"), "reuniao")
    expect(titles()).toEqual(["Reunião de março"])
  })

  it("busca sem resultado mostra o vazio e limpar filtros restaura as linhas", async () => {
    render(<DataTable columns={columns} data={DOCS} />)
    await userEvent.type(screen.getByRole("searchbox"), "zeppelin")
    expect(screen.getByText("Nenhum resultado")).toBeTruthy()
    const clear = screen.getAllByRole("button", { name: "Limpar filtros" })
    await userEvent.click(clear[clear.length - 1])
    expect(titles()).toHaveLength(4)
  })

  it("faceta de multi-seleção filtra e mostra a contagem de cada opção", async () => {
    render(
      <DataTable
        columns={columns}
        data={DOCS}
        facets={[{ columnId: "type", label: "Tipo" }]}
      />
    )
    await userEvent.click(screen.getByRole("button", { name: /^Tipo\s*\d*$/ }))
    const pdf = await screen.findByRole("menuitemcheckbox", { name: /PDF/ })
    expect(pdf.textContent).toContain("2")
    expect(
      screen.getByRole("menuitemcheckbox", { name: /Planilha/ }).textContent
    ).toContain("1")

    await userEvent.click(pdf)
    expect(titles().sort()).toEqual([
      "Contrato de serviço",
      "Manual do usuário",
    ])

    // segunda opção: a seleção soma (OU), não substitui
    await userEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /Planilha/ })
    )
    expect(titles()).toHaveLength(3)
  })

  it("a faceta respeita a busca: a contagem mostra só o que sobra", async () => {
    render(
      <DataTable
        columns={columns}
        data={DOCS}
        facets={[{ columnId: "type", label: "Tipo" }]}
      />
    )
    await userEvent.type(screen.getByRole("searchbox"), "contrato")
    await userEvent.click(screen.getByRole("button", { name: /^Tipo\s*\d*$/ }))
    expect(
      (await screen.findByRole("menuitemcheckbox", { name: /PDF/ })).textContent
    ).toContain("1")
    expect(
      screen.getByRole("menuitemcheckbox", { name: /DOCX/ }).textContent
    ).toContain("0")
  })

  it("ordena pelo cabeçalho: crescente, decrescente, sem ordem", async () => {
    render(<DataTable columns={columns} data={DOCS} searchable={false} />)
    const header = screen.getByRole("button", { name: /^Documento/ })
    const th = header.closest("th")!

    await userEvent.click(header)
    expect(th.getAttribute("aria-sort")).toBe("ascending")
    expect(titles()).toEqual([
      "Contrato de serviço",
      "Manual do usuário",
      "Orçamento anual",
      "Reunião de março",
    ])

    await userEvent.click(header)
    expect(th.getAttribute("aria-sort")).toBe("descending")
    expect(titles()[0]).toBe("Reunião de março")

    await userEvent.click(header)
    expect(th.getAttribute("aria-sort")).toBeNull()
    expect(titles()[0]).toBe("Reunião de março") // ordem original dos dados
  })

  it("pagina: tamanho da página e botões de anterior e próxima", async () => {
    render(
      <DataTable
        columns={columns}
        data={DOCS}
        searchable={false}
        pagination={undefined}
        pageSizeOptions={[2, 10]}
      />
    )
    expect(titles()).toHaveLength(2)
    expect(screen.getByText("Página 1 de 2")).toBeTruthy()
    await userEvent.click(
      screen.getByRole("button", { name: "Próxima página" })
    )
    expect(titles()).toEqual(["Manual do usuário", "Orçamento anual"])
    expect(
      (
        screen.getByRole("button", {
          name: "Próxima página",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
  })

  it("esconde e mostra colunas pelo menu", async () => {
    render(<DataTable columns={columns} data={DOCS} searchable={false} />)
    await userEvent.click(
      screen.getByRole("button", { name: "Escolher colunas visíveis" })
    )
    await userEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "Tipo" })
    )
    expect(screen.queryByRole("columnheader", { name: /Tipo/ })).toBeNull()
  })
})

describe("DataTable, seleção e ação em lote", () => {
  function setup(overrides: Partial<DataTableBulkAction<Doc>> = {}) {
    const reindex = vi.fn()
    const remove = vi.fn()
    const actions: DataTableBulkAction<Doc>[] = [
      { id: "reindex", label: "Reindexar", onAction: reindex },
      {
        id: "delete",
        label: "Excluir",
        destructive: true,
        onAction: remove,
        ...overrides,
      },
    ]
    render(
      <DataTable
        columns={columns}
        data={DOCS}
        searchable={false}
        bulkActions={actions}
      />
    )
    return { reindex, remove }
  }

  const rowBox = (name: string) =>
    within(screen.getByRole("row", { name: new RegExp(name) })).getByRole(
      "checkbox"
    )

  it("a barra só existe com linhas selecionadas e conta quantas", async () => {
    setup()
    expect(screen.queryByRole("region", { name: "Ações em lote" })).toBeNull()
    await userEvent.click(rowBox("Reunião"))
    await userEvent.click(rowBox("Manual"))
    const bar = screen.getByRole("region", { name: "Ações em lote" })
    expect(within(bar).getByText("2 selecionados")).toBeTruthy()
  })

  it("a ação recebe os ids e as linhas selecionadas, e a seleção é limpa", async () => {
    const { reindex } = setup()
    await userEvent.click(rowBox("Reunião"))
    await userEvent.click(rowBox("Orçamento"))
    await userEvent.click(screen.getByRole("button", { name: "Reindexar" }))
    expect(reindex).toHaveBeenCalledOnce()
    const selection = reindex.mock.calls[0][0]
    expect(selection.ids.sort()).toEqual(["a", "d"])
    expect(selection.rows.map((row: Doc) => row.title).sort()).toEqual([
      "Orçamento anual",
      "Reunião de março",
    ])
    expect(screen.queryByRole("region", { name: "Ações em lote" })).toBeNull()
  })

  it("ação destrutiva só roda depois de confirmar; cancelar não chama", async () => {
    const { remove } = setup()
    await userEvent.click(rowBox("Contrato"))
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }))

    const cancel = await screen.findByRole("button", { name: "Cancelar" })
    expect(remove).not.toHaveBeenCalled()
    await userEvent.click(cancel)
    expect(remove).not.toHaveBeenCalled()
    // a seleção continua, a pessoa desistiu da ação
    expect(screen.getByRole("region", { name: "Ações em lote" })).toBeTruthy()

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("Excluir 1 item?")).toBeTruthy()
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Excluir" })
    )
    expect(remove).toHaveBeenCalledOnce()
    expect(remove.mock.calls[0][0].ids).toEqual(["b"])
  })

  it("mudar a busca limpa a seleção: a ação nunca atinge linha escondida", async () => {
    const onSelection = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={DOCS}
        bulkActions={[{ id: "x", label: "Fazer", onAction: vi.fn() }]}
        onRowSelectionChange={onSelection}
      />
    )
    await userEvent.click(rowBox("Reunião"))
    expect(screen.getByRole("region", { name: "Ações em lote" })).toBeTruthy()
    await userEvent.type(screen.getByRole("searchbox"), "contrato")
    expect(onSelection).toHaveBeenLastCalledWith({})
  })
})

describe("DataTable, modo server (estado por props)", () => {
  it("não filtra nem pagina sozinha: mostra a página recebida e avisa o pai", async () => {
    const onSearchChange = vi.fn()
    const onPaginationChange = vi.fn()
    const onSortingChange = vi.fn()
    render(
      <DataTable
        mode="server"
        columns={columns}
        data={DOCS.slice(0, 2)}
        rowCount={40}
        search=""
        onSearchChange={onSearchChange}
        sorting={[]}
        onSortingChange={onSortingChange}
        pagination={{ pageIndex: 0, pageSize: 2 }}
        onPaginationChange={onPaginationChange}
        searchDebounce={0}
      />
    )
    expect(titles()).toHaveLength(2)
    expect(screen.getByText("Página 1 de 20")).toBeTruthy()

    await userEvent.type(screen.getByRole("searchbox"), "x")
    expect(onSearchChange).toHaveBeenCalledWith("x")
    // o pai não atualizou a prop: as duas linhas continuam, nada filtrado aqui
    expect(titles()).toHaveLength(2)

    await userEvent.click(
      screen.getByRole("button", { name: "Próxima página" })
    )
    expect(onPaginationChange).toHaveBeenCalledWith({
      pageIndex: 1,
      pageSize: 2,
    })

    await userEvent.click(screen.getByRole("button", { name: /^Documento/ }))
    expect(onSortingChange).toHaveBeenCalledWith([{ id: "title", desc: false }])
  })

  it("mudar a busca volta para a primeira página", async () => {
    const onPaginationChange = vi.fn()
    render(
      <DataTable
        mode="server"
        columns={columns}
        data={DOCS}
        rowCount={40}
        pagination={{ pageIndex: 3, pageSize: 4 }}
        onPaginationChange={onPaginationChange}
        searchDebounce={0}
      />
    )
    await userEvent.type(screen.getByRole("searchbox"), "a")
    expect(onPaginationChange).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 4,
    })
  })

  it("as opções e contagens da faceta vêm do pai", async () => {
    const onFacetFiltersChange = vi.fn()
    render(
      <DataTable
        mode="server"
        columns={columns}
        data={DOCS}
        rowCount={90}
        facets={[
          {
            columnId: "type",
            label: "Tipo",
            options: [
              { value: "PDF", count: 61 },
              { value: "DOCX", label: "Word", count: 29 },
            ],
          },
        ]}
        facetFilters={{}}
        onFacetFiltersChange={onFacetFiltersChange}
      />
    )
    await userEvent.click(screen.getByRole("button", { name: /^Tipo\s*\d*$/ }))
    expect(
      (await screen.findByRole("menuitemcheckbox", { name: /PDF/ })).textContent
    ).toContain("61")
    await userEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /Word/ })
    )
    expect(onFacetFiltersChange).toHaveBeenCalledWith({ type: ["DOCX"] })
  })
})

describe("DataTable, estados", () => {
  it("carregando sem dados mostra o esqueleto anunciado", () => {
    render(<DataTable columns={columns} data={[]} loading />)
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true")
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("vazio sem filtros mostra o estado vazio, sem botão de limpar", () => {
    render(<DataTable columns={columns} data={[]} />)
    expect(screen.getByText("Nada por aqui")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()
  })

  it("erro é um alerta com tentar de novo", async () => {
    const onRetry = vi.fn()
    render(
      <DataTable columns={columns} data={[]} error="503" onRetry={onRetry} />
    )
    expect(screen.getByRole("alert")).toBeTruthy()
    expect(screen.getByText("503")).toBeTruthy()
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar de novo" })
    )
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
