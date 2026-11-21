// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  CommandPalette,
  CommandPaletteTrigger,
} from "@registry/command-palette/command-palette"
import { paletteFilter } from "@registry/command-palette/filter"
import {
  formatShortcut,
  matchesShortcut,
} from "@registry/command-palette/shortcut"
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
} from "@registry/command-palette/types"

// O cmdk usa estas duas APIs; o jsdom não as tem.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(cleanup)

const key = (init: Partial<KeyboardEventInit> & { key: string }) => ({
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...init,
})

describe("atalho", () => {
  it("mod+k casa Ctrl+K e Cmd+K, nada além disso", () => {
    expect(matchesShortcut(key({ key: "k", ctrlKey: true }), "mod+k")).toBe(
      true
    )
    expect(matchesShortcut(key({ key: "K", metaKey: true }), "mod+k")).toBe(
      true
    )
    expect(matchesShortcut(key({ key: "k" }), "mod+k")).toBe(false)
    expect(matchesShortcut(key({ key: "j", ctrlKey: true }), "mod+k")).toBe(
      false
    )
    expect(
      matchesShortcut(key({ key: "k", ctrlKey: true, shiftKey: true }), "mod+k")
    ).toBe(false)
    expect(
      matchesShortcut(key({ key: "k", ctrlKey: true, altKey: true }), "mod+k")
    ).toBe(false)
  })

  it("atalho configurável, com modificadores exatos", () => {
    expect(
      matchesShortcut(
        key({ key: "p", ctrlKey: true, shiftKey: true }),
        "ctrl+shift+p"
      )
    ).toBe(true)
    expect(
      matchesShortcut(key({ key: "p", ctrlKey: true }), "ctrl+shift+p")
    ).toBe(false)
    // “ctrl” é Ctrl mesmo: Cmd não vale
    expect(
      matchesShortcut(
        key({ key: "p", metaKey: true, shiftKey: true }),
        "ctrl+shift+p"
      )
    ).toBe(false)
    expect(matchesShortcut(key({ key: "/" }), "/")).toBe(true)
    expect(matchesShortcut(key({ key: "/", ctrlKey: true }), "/")).toBe(false)
  })

  it("texto exibido por plataforma", () => {
    expect(formatShortcut("mod+k", true)).toBe("⌘K")
    expect(formatShortcut("mod+k", false)).toBe("Ctrl K")
    expect(formatShortcut("mod+shift+p", true)).toBe("⌘⇧P")
  })
})

describe("filtro", () => {
  it("ignora acento e caixa e exige todas as palavras", () => {
    expect(paletteFilter("a", "reuniao", ["Reunião de março"])).toBeGreaterThan(
      0
    )
    expect(
      paletteFilter("a", "marco reuniao", ["Reunião de março"])
    ).toBeGreaterThan(0)
    expect(paletteFilter("a", "reuniao contrato", ["Reunião de março"])).toBe(0)
    expect(paletteFilter("a", "  ", ["x"])).toBe(1)
  })

  it("começar pela busca pontua mais; resultado remoto passa sempre", () => {
    expect(paletteFilter("a", "ata", ["Ata de março"])).toBeGreaterThan(
      paletteFilter("a", "ata", ["Relatório de ata"])
    )
    expect(paletteFilter("remote:1", "qualquer coisa", ["outro"])).toBe(1)
  })
})

function setup(
  overrides: Partial<React.ComponentProps<typeof CommandPalette>> = {}
) {
  const onSelect = {
    home: vi.fn(),
    library: vi.fn(),
    reindex: vi.fn(),
    recent: vi.fn(),
  }
  const groups: CommandPaletteGroup[] = [
    {
      id: "nav",
      heading: "Navegação",
      items: [
        {
          id: "home",
          label: "Ir para o início",
          shortcut: "G I",
          onSelect: onSelect.home,
        },
        {
          id: "library",
          label: "Ir para a biblioteca",
          keywords: ["acervo"],
          onSelect: onSelect.library,
        },
      ],
    },
    {
      id: "actions",
      heading: "Ações",
      items: [
        { id: "reindex", label: "Reindexar tudo", onSelect: onSelect.reindex },
      ],
    },
    {
      id: "recent",
      heading: "Recentes",
      items: [
        {
          id: "contract",
          label: "Contrato de serviço",
          onSelect: onSelect.recent,
        },
      ],
    },
  ]
  const utils = render(<CommandPalette groups={groups} {...overrides} />)
  return { ...utils, onSelect }
}

const dialog = () => screen.queryByRole("dialog")
const search = () => screen.getByRole("combobox")

describe("CommandPalette: abrir e fechar", () => {
  it("Ctrl+K abre com o foco no campo de busca; de novo, fecha", async () => {
    setup()
    expect(dialog()).toBeNull()
    await userEvent.keyboard("{Control>}k{/Control}")
    expect(await screen.findByRole("dialog")).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(search()))
    await userEvent.keyboard("{Control>}k{/Control}")
    await waitFor(() => expect(dialog()).toBeNull())
  })

  it("Cmd+K também abre, e Esc fecha", async () => {
    setup()
    await userEvent.keyboard("{Meta>}k{/Meta}")
    expect(await screen.findByRole("dialog")).toBeTruthy()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(dialog()).toBeNull())
  })

  it("atalho configurável: o padrão deixa de valer", async () => {
    setup({ shortcut: "ctrl+shift+p" })
    await userEvent.keyboard("{Control>}k{/Control}")
    expect(dialog()).toBeNull()
    await userEvent.keyboard("{Control>}{Shift>}p{/Shift}{/Control}")
    expect(await screen.findByRole("dialog")).toBeTruthy()
  })

  it("shortcut={null} desliga o atalho global", async () => {
    setup({ shortcut: null })
    await userEvent.keyboard("{Control>}k{/Control}")
    expect(dialog()).toBeNull()
  })

  it("o gatilho abre a paleta; fechar e reabrir começa com a busca limpa", async () => {
    setup({ trigger: <CommandPaletteTrigger /> })
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }))
    await userEvent.type(await screen.findByRole("combobox"), "reindex")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(dialog()).toBeNull())
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }))
    expect(
      ((await screen.findByRole("combobox")) as HTMLInputElement).value
    ).toBe("")
  })

  it("aberta por `open` controlado; fechar avisa o pai", async () => {
    const onOpenChange = vi.fn()
    setup({ open: true, onOpenChange })
    expect(await screen.findByRole("dialog")).toBeTruthy()
    await userEvent.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe("CommandPalette: grupos, busca e seleção", () => {
  async function open() {
    await userEvent.keyboard("{Control>}k{/Control}")
    await screen.findByRole("dialog")
    // o foco entra no campo logo depois de abrir; só então o teclado vale
    await waitFor(() => expect(document.activeElement).toBe(search()))
  }

  it("mostra os grupos com título, ícone-slot e o atalho de cada item", async () => {
    setup()
    await open()
    expect(screen.getByText("Navegação")).toBeTruthy()
    expect(screen.getByText("Ações")).toBeTruthy()
    expect(screen.getByText("Recentes")).toBeTruthy()
    expect(screen.getAllByRole("option")).toHaveLength(4)
    expect(screen.getByText("G I")).toBeTruthy()
  })

  it("digitar filtra (sem acento, por palavra-chave) e some o grupo sem itens", async () => {
    setup()
    await open()
    await userEvent.type(search(), "acervo")
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Ir para a biblioteca",
    ])
    // o cmdk esconde o grupo sem itens com o atributo `hidden`
    expect(
      screen.getByText("Ações").closest("[cmdk-group]")?.hasAttribute("hidden")
    ).toBe(true)
    expect(
      screen
        .getByText("Navegação")
        .closest("[cmdk-group]")
        ?.hasAttribute("hidden")
    ).toBe(false)

    await userEvent.clear(search())
    await userEvent.type(search(), "contrato servico")
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Contrato de serviço",
    ])
  })

  it("sem resultado mostra o vazio", async () => {
    setup()
    await open()
    await userEvent.type(search(), "zeppelin")
    expect(screen.getByText("Nada encontrado.")).toBeTruthy()
    expect(screen.queryAllByRole("option")).toHaveLength(0)
  })

  it("clicar num item fecha a paleta e chama o onSelect dele (só dele)", async () => {
    const { onSelect } = setup()
    await open()
    await userEvent.click(
      screen.getByRole("option", { name: "Reindexar tudo" })
    )
    expect(onSelect.reindex).toHaveBeenCalledTimes(1)
    expect(onSelect.home).not.toHaveBeenCalled()
    await waitFor(() => expect(dialog()).toBeNull())
  })

  it("teclado: setas movem, Enter escolhe o item destacado", async () => {
    const { onSelect } = setup()
    await open()
    // o primeiro item já vem destacado
    expect(screen.getAllByRole("option")[0].getAttribute("aria-selected")).toBe(
      "true"
    )
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(screen.getAllByRole("option")[2].getAttribute("aria-selected")).toBe(
      "true"
    )
    await userEvent.keyboard("{Enter}")
    expect(onSelect.reindex).toHaveBeenCalledTimes(1)
    expect(onSelect.home).not.toHaveBeenCalled()
    expect(onSelect.library).not.toHaveBeenCalled()
  })

  it("digitar e Enter escolhe o melhor resultado", async () => {
    const { onSelect } = setup()
    await open()
    await userEvent.type(search(), "biblio{Enter}")
    expect(onSelect.library).toHaveBeenCalledTimes(1)
  })

  it("item desabilitado não dispara onSelect", async () => {
    const onSelect = vi.fn()
    render(
      <CommandPalette
        open
        groups={[
          {
            id: "g",
            heading: "G",
            items: [{ id: "x", label: "Bloqueado", disabled: true, onSelect }],
          },
        ]}
      />
    )
    await userEvent.click(
      await screen.findByRole("option", { name: "Bloqueado" })
    )
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe("CommandPalette: busca assíncrona", () => {
  function remoteSetup() {
    const calls: Array<{
      query: string
      signal: AbortSignal
      resolve: (items: CommandPaletteItem[]) => void
      reject: (reason: unknown) => void
    }> = []
    const searchFn = vi.fn(
      (query: string, { signal }: { signal: AbortSignal }) =>
        new Promise<CommandPaletteItem[]>((resolve, reject) => {
          calls.push({ query, signal, resolve, reject })
        })
    )
    setup({ search: searchFn, searchDebounce: 0 })
    return { calls, searchFn }
  }

  const remoteItem = (
    id: string,
    label: string,
    onSelect = vi.fn()
  ): CommandPaletteItem => ({
    id,
    label,
    onSelect,
  })

  const lastCall = <T,>(calls: T[]) =>
    calls[calls.length - 1] ?? ({ query: "" } as T & { query: string })

  async function openAndType(text: string) {
    await userEvent.keyboard("{Control>}k{/Control}")
    const input = await screen.findByRole("combobox")
    await waitFor(() => expect(document.activeElement).toBe(input))
    await userEvent.type(input, text)
  }

  it("mostra carregando, depois os resultados num grupo; itens remotos não são filtrados pelo texto", async () => {
    const { calls } = remoteSetup()
    await openAndType("xyz")
    await waitFor(() => expect(lastCall(calls).query).toBe("xyz"))
    expect(screen.getByText("Buscando…")).toBeTruthy()
    // enquanto carrega, o vazio não aparece
    expect(screen.queryByText("Nada encontrado.")).toBeNull()

    // o rótulo não contém “xyz”: se o filtro local agisse, o item sumiria
    await act(async () =>
      lastCall(calls).resolve([remoteItem("r1", "Planilha de custos")])
    )
    expect(screen.queryByText("Buscando…")).toBeNull()
    expect(screen.getByText("Resultados")).toBeTruthy()
    expect(
      screen.getByRole("option", { name: "Planilha de custos" })
    ).toBeTruthy()
  })

  it("escolher um resultado remoto chama o onSelect dele e fecha", async () => {
    const { calls } = remoteSetup()
    const onSelect = vi.fn()
    await openAndType("plan")
    await waitFor(() => expect(lastCall(calls).query).toBe("plan"))
    await act(async () =>
      lastCall(calls).resolve([
        remoteItem("r1", "Planilha de custos", onSelect),
      ])
    )
    await userEvent.click(
      screen.getByRole("option", { name: "Planilha de custos" })
    )
    expect(onSelect).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(dialog()).toBeNull())
  })

  it("sem resultado remoto nem local mostra o vazio", async () => {
    const { calls } = remoteSetup()
    await openAndType("zeppelin")
    await waitFor(() => expect(lastCall(calls).query).toBe("zeppelin"))
    await act(async () => lastCall(calls).resolve([]))
    expect(screen.getByText("Nada encontrado.")).toBeTruthy()
    expect(screen.queryByText("Buscando…")).toBeNull()
  })

  it("falha da busca mostra o aviso e não derruba os itens locais", async () => {
    const { calls } = remoteSetup()
    await openAndType("rei")
    await waitFor(() => expect(lastCall(calls).query).toBe("rei"))
    await act(async () => lastCall(calls).reject(new Error("rede")))
    expect(screen.getByText("Não foi possível buscar agora.")).toBeTruthy()
    expect(screen.getByRole("option", { name: "Reindexar tudo" })).toBeTruthy()
  })

  it("continuar digitando aborta a busca anterior e ignora a resposta velha", async () => {
    const { calls } = remoteSetup()
    await openAndType("a")
    await waitFor(() => expect(calls.some((c) => c.query === "a")).toBe(true))
    await userEvent.keyboard("bc")
    await waitFor(() => expect(calls.some((c) => c.query === "abc")).toBe(true))

    const first = calls.find((c) => c.query === "a")!
    const last = calls.find((c) => c.query === "abc")!
    expect(first.signal.aborted).toBe(true)
    expect(last.signal.aborted).toBe(false)

    await act(async () => first.resolve([remoteItem("old", "Resposta velha")]))
    expect(screen.queryByText("Resposta velha")).toBeNull()
    await act(async () => last.resolve([remoteItem("new", "Resposta nova")]))
    expect(screen.getByText("Resposta nova")).toBeTruthy()
  })

  it("a resposta velha que chega depois da nova não a desfaz", async () => {
    const { calls } = remoteSetup()
    await openAndType("a")
    await waitFor(() => expect(calls.some((c) => c.query === "a")).toBe(true))
    await userEvent.keyboard("bc")
    await waitFor(() => expect(calls.some((c) => c.query === "abc")).toBe(true))
    const first = calls.find((c) => c.query === "a")!
    const last = calls.find((c) => c.query === "abc")!

    await act(async () => last.resolve([remoteItem("new", "Resposta nova")]))
    await act(async () => first.resolve([remoteItem("old", "Resposta velha")]))
    expect(screen.getByText("Resposta nova")).toBeTruthy()
    expect(screen.queryByText("Resposta velha")).toBeNull()
    expect(screen.queryByText("Buscando…")).toBeNull()
  })

  it("campo vazio não chama a busca", async () => {
    const { searchFn } = remoteSetup()
    await userEvent.keyboard("{Control>}k{/Control}")
    await screen.findByRole("combobox")
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(searchFn).not.toHaveBeenCalled()
  })
})

describe("CommandPaletteTrigger", () => {
  it("mostra o atalho da paleta", () => {
    render(<CommandPaletteTrigger shortcut="mod+k" />)
    const button = screen.getByRole("button", { name: "Buscar" })
    expect(button.querySelector("kbd")?.textContent).toMatch(/^(⌘K|Ctrl K)$/)
  })
})
