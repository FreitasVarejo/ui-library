// @vitest-environment jsdom
import { useState } from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Sheet, SheetTitle, rememberOpener, stackTop } from "@registry/sheet"
import type { SheetProps } from "@registry/sheet"

afterEach(cleanup)

const esc = () =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })

/** `{aberta && <Sheet>}`: a folha abre ao montar e fecha ao desmontar. */
function Opener({
  label = "abrir",
  withClose = true,
  ...props
}: { label?: string; withClose?: boolean } & Partial<SheetProps>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <Sheet
          onOpenChange={withClose ? () => setOpen(false) : undefined}
          {...props}
        >
          <SheetTitle>Título da folha</SheetTitle>
          <button type="button">primeiro</button>
          <button type="button" onClick={() => setOpen(false)}>
            fechar por dentro
          </button>
        </Sheet>
      )}
    </>
  )
}

describe("Sheet", () => {
  it("é um diálogo modal nomeado pelo SheetTitle", async () => {
    render(<Opener />)
    fireEvent.click(screen.getByRole("button", { name: "abrir" }))

    const dialog = await screen.findByRole("dialog", {
      name: "Título da folha",
    })
    expect(dialog.getAttribute("data-slot")).toBe("sheet")
    expect(dialog.getAttribute("data-side")).toBe("bottom")
  })

  it("foca o título ao abrir", async () => {
    render(<Opener />)
    fireEvent.click(screen.getByRole("button", { name: "abrir" }))

    const title = await screen.findByText("Título da folha")
    await vi.waitFor(() => expect(document.activeElement).toBe(title))
    expect(title.getAttribute("tabindex")).toBe("-1")
  })

  it("initialFocus manda o foco para outro controle", async () => {
    function Custom() {
      const [ref, setRef] = useState<HTMLButtonElement | null>(null)
      return (
        <Sheet initialFocus={{ current: ref }}>
          <SheetTitle>T</SheetTitle>
          <button type="button" ref={setRef}>
            campo
          </button>
        </Sheet>
      )
    }
    render(<Custom />)
    const field = await screen.findByRole("button", { name: "campo" })
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
  })

  it("Esc fecha quando há onOpenChange, e o foco volta a quem abriu", async () => {
    render(<Opener />)
    const opener = screen.getByRole("button", { name: "abrir" })
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole("dialog")

    esc()

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it("Esc não faz nada sem onOpenChange", async () => {
    render(<Opener withClose={false} />)
    fireEvent.click(screen.getByRole("button", { name: "abrir" }))
    await screen.findByRole("dialog")

    esc()
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))

    expect(screen.getByRole("dialog").isConnected).toBe(true)
  })

  // No Safari do iOS tocar num botão não o foca: `activeElement` já é o `body`
  // quando a folha abre. `fireEvent.click` também não foca nada.
  it("devolve o foco ao botão tocado mesmo quando o toque não o focou (Safari/iOS)", async () => {
    render(<Opener />)
    const opener = screen.getByRole("button", { name: "abrir" })
    expect(document.activeElement).toBe(document.body)

    fireEvent.click(opener)
    await screen.findByRole("dialog")
    esc()

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it("o toque no ícone dentro do botão conta como toque no botão", async () => {
    function WithIcon() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            <span data-testid="icone">abrir</span>
          </button>
          {open && (
            <Sheet onOpenChange={() => setOpen(false)}>
              <SheetTitle>T</SheetTitle>
            </Sheet>
          )}
        </>
      )
    }
    render(<WithIcon />)

    fireEvent.click(screen.getByTestId("icone"))
    await screen.findByRole("dialog")
    esc()

    await vi.waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button"))
    )
  })

  it("quem abriu sem clique (rememberOpener) recebe o foco ao fechar", async () => {
    render(<Opener />)
    const hero = screen.getByRole("button", { name: "abrir" })
    rememberOpener(hero)
    fireEvent.click(hero)
    await screen.findByRole("dialog")
    esc()

    await vi.waitFor(() => expect(document.activeElement).toBe(hero))
  })

  it("o último toque que saiu do documento não recebe o foco de volta", async () => {
    function Ephemeral() {
      const [exists, setExists] = useState(true)
      const [open, setOpen] = useState(false)
      return (
        <>
          {exists && (
            <button type="button" onClick={() => setExists(false)}>
              efêmero
            </button>
          )}
          <button type="button" onClick={() => setOpen(true)}>
            abrir por fora
          </button>
          {open && (
            <Sheet onOpenChange={() => setOpen(false)}>
              <SheetTitle>T</SheetTitle>
            </Sheet>
          )}
        </>
      )
    }
    render(<Ephemeral />)
    const ephemeral = screen.getByRole("button", { name: "efêmero" })
    fireEvent.click(ephemeral)
    expect(ephemeral.isConnected).toBe(false)
    // abre sem toque: a pessoa não clicou em nada que ainda exista
    const spy = vi.spyOn(HTMLElement.prototype, "focus")
    try {
      fireEvent.click(screen.getByRole("button", { name: "abrir por fora" }))
      await screen.findByRole("dialog")
      esc()
      await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(spy.mock.contexts).not.toContain(ephemeral)
    } finally {
      spy.mockRestore()
    }
  })

  it("passa className, style e ref ao diálogo, e a classe de quem chama vence a do padrão", async () => {
    const ref = vi.fn()
    render(
      <Sheet ref={ref} className="minha-classe p-0" style={{ color: "red" }}>
        <SheetTitle>T</SheetTitle>
      </Sheet>
    )
    const dialog = await screen.findByRole("dialog")
    expect(dialog.classList.contains("minha-classe")).toBe(true)
    expect(dialog.classList.contains("p-0")).toBe(true)
    expect(dialog.classList.contains("p-4")).toBe(false)
    expect(dialog.style.color).toBe("red")
    expect(ref).toHaveBeenCalledWith(dialog)
  })
})

describe("Sheet: pilha", () => {
  /** Duas irmãs: a de cima não está dentro da de baixo na árvore do React. */
  function Siblings({ topOpen }: { topOpen: boolean }) {
    const [bottomOpen, setBottomOpen] = useState(true)
    const [topIsOpen, setTopIsOpen] = useState(topOpen)
    return (
      <>
        {bottomOpen && (
          <Sheet onOpenChange={() => setBottomOpen(false)}>
            <SheetTitle>De baixo</SheetTitle>
          </Sheet>
        )}
        {topIsOpen && (
          <Sheet onOpenChange={() => setTopIsOpen(false)}>
            <SheetTitle>De cima</SheetTitle>
          </Sheet>
        )}
      </>
    )
  }

  it("Esc com duas irmãs abertas fecha só a de cima; o seguinte, a de baixo", async () => {
    render(<Siblings topOpen />)
    await vi.waitFor(() =>
      expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(2)
    )

    esc()
    await vi.waitFor(() => expect(screen.queryByText("De cima")).toBeNull())
    expect(screen.getByText("De baixo").isConnected).toBe(true)

    esc()
    await vi.waitFor(() => expect(screen.queryByText("De baixo")).toBeNull())
  })

  it("a de cima, sem onOpenChange, segura o Esc e a de baixo não fecha", async () => {
    const closeBottom = vi.fn()
    render(
      <>
        <Sheet onOpenChange={closeBottom}>
          <SheetTitle>De baixo</SheetTitle>
        </Sheet>
        <Sheet>
          <SheetTitle>De cima</SheetTitle>
        </Sheet>
      </>
    )
    await vi.waitFor(() =>
      expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(2)
    )

    esc()
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))

    expect(closeBottom).not.toHaveBeenCalled()
  })

  it("aninhada na árvore do React, o Esc fecha só a de cima e o foco volta ao botão da de baixo que a abriu", async () => {
    function Nested() {
      const [topOpen, setTopOpen] = useState(false)
      return (
        <Sheet onOpenChange={() => undefined}>
          <SheetTitle>De baixo</SheetTitle>
          <button type="button" onClick={() => setTopOpen(true)}>
            abrir a de cima
          </button>
          {topOpen && (
            <Sheet onOpenChange={() => setTopOpen(false)}>
              <SheetTitle>De cima</SheetTitle>
            </Sheet>
          )}
        </Sheet>
      )
    }
    render(<Nested />)
    const open = await screen.findByRole("button", { name: "abrir a de cima" })
    open.focus()
    fireEvent.click(open)
    await screen.findByText("De cima")

    esc()

    await vi.waitFor(() => expect(screen.queryByText("De cima")).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(open))
    expect(screen.getByText("De baixo").isConnected).toBe(true)
  })

  it("stackTop aponta o diálogo da folha de cima", async () => {
    render(<Siblings topOpen />)
    await vi.waitFor(() =>
      expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(2)
    )

    const top = screen.getByText("De cima").closest('[role="dialog"]')
    expect(stackTop()?.current).toBe(top)
  })
})

describe("Sheet: backGuard", () => {
  function Guard({ log }: { log: string[] }) {
    // Monta e desmonta como a peça do roteador: o log mostra quem existiu.
    return (
      <span
        data-testid="guard"
        ref={(node) => {
          if (node) log.push("montou")
          else log.push("desmontou")
        }}
      />
    )
  }

  it("monta enquanto a folha está aberta, e some quando ela fecha", async () => {
    const log: string[] = []
    render(<Opener backGuard={<Guard log={log} />} />)
    expect(screen.queryByTestId("guard")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "abrir" }))
    await screen.findByTestId("guard")

    esc()
    await vi.waitFor(() => expect(screen.queryByTestId("guard")).toBeNull())
    expect(log).toEqual(["montou", "desmontou"])
  })

  it("com duas abertas só a de cima tem o backGuard; fechada a de cima, ele volta à de baixo", async () => {
    const lower: string[] = []
    const upper: string[] = []
    function Two() {
      const [top, setTop] = useState(true)
      return (
        <>
          <Sheet backGuard={<Guard log={lower} />}>
            <SheetTitle>De baixo</SheetTitle>
          </Sheet>
          {top && (
            <Sheet
              onOpenChange={() => setTop(false)}
              backGuard={<Guard log={upper} />}
            >
              <SheetTitle>De cima</SheetTitle>
            </Sheet>
          )}
        </>
      )
    }
    render(<Two />)
    await screen.findByText("De cima")
    await vi.waitFor(() => expect(upper).toEqual(["montou"]))
    expect(screen.getAllByTestId("guard")).toHaveLength(1)
    expect(lower.filter((entry) => entry === "montou").length).toBe(
      lower.filter((entry) => entry === "desmontou").length
    )

    esc()

    await vi.waitFor(() => expect(upper).toEqual(["montou", "desmontou"]))
    await vi.waitFor(() =>
      expect(screen.getAllByTestId("guard")).toHaveLength(1)
    )
    expect(lower.at(-1)).toBe("montou")
  })

  it("não toca no histórico", async () => {
    const push = vi.spyOn(window.history, "pushState")
    const replace = vi.spyOn(window.history, "replaceState")
    try {
      render(<Opener />)
      fireEvent.click(screen.getByRole("button", { name: "abrir" }))
      await screen.findByRole("dialog")
      esc()
      await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(push).not.toHaveBeenCalled()
      expect(replace).not.toHaveBeenCalled()
    } finally {
      push.mockRestore()
      replace.mockRestore()
    }
  })
})
