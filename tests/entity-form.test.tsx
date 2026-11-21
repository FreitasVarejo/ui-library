// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { EntityForm } from "@registry/entity-form/entity-form"
import type { EntityFormProps } from "@registry/entity-form/entity-form"
import type { EntityFormField } from "@registry/entity-form/types"

afterEach(cleanup)

const schema = z.object({
  title: z.string().min(3, "O título precisa de ao menos 3 caracteres."),
  author: z.string().email("Informe um e-mail válido."),
})
type Values = z.infer<typeof schema>

const fields: EntityFormField<Values>[] = [
  { name: "title", label: "Título" },
  { name: "author", label: "E-mail", type: "email" },
]

function page(props: Partial<EntityFormProps<Values>> = {}) {
  const onSubmit = vi.fn()
  render(
    <EntityForm<Values>
      title="Novo documento"
      schema={schema}
      defaultValues={{ title: "", author: "" }}
      fields={fields}
      onSubmit={onSubmit}
      {...props}
    />
  )
  return { onSubmit }
}

const fill = async (title: string, author: string) => {
  const titleInput = screen.getByLabelText("Título")
  const authorInput = screen.getByLabelText("E-mail")
  await userEvent.clear(titleInput)
  await userEvent.clear(authorInput)
  if (title) await userEvent.type(titleInput, title)
  if (author) await userEvent.type(authorInput, author)
}

describe("EntityForm como página", () => {
  it("enviar vazio mostra o erro de cada campo e não chama onSubmit", async () => {
    const { onSubmit } = page()
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(
      await screen.findByText("O título precisa de ao menos 3 caracteres.")
    ).toBeTruthy()
    expect(screen.getByText("Informe um e-mail válido.")).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Título").getAttribute("aria-invalid")).toBe(
      "true"
    )
  })

  it("só o campo inválido recebe erro", async () => {
    page()
    await fill("Contrato", "isso-nao-e-email")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(await screen.findByText("Informe um e-mail válido.")).toBeTruthy()
    expect(
      screen.queryByText("O título precisa de ao menos 3 caracteres.")
    ).toBeNull()
  })

  it("dados válidos chegam a onSubmit com os valores digitados", async () => {
    const onSaved = vi.fn()
    const { onSubmit } = page({ onSaved })
    await fill("Contrato", "ana@exemplo.com")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      title: "Contrato",
      author: "ana@exemplo.com",
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
  })

  it("salvar mostra o estado de envio e trava o botão até terminar", async () => {
    let finish!: () => void
    const onSubmit = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    )
    page({ onSubmit })
    await fill("Contrato", "ana@exemplo.com")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    const busy = await screen.findByRole("button", { name: "Salvando…" })
    expect((busy as HTMLButtonElement).disabled).toBe(true)
    finish()
    await screen.findByRole("button", { name: "Salvar" })
  })

  it("erro por campo devolvido pelo servidor aparece no campo", async () => {
    page({
      onSubmit: () => ({
        fieldErrors: { title: "Já existe um documento com este título." },
      }),
    })
    await fill("Contrato", "ana@exemplo.com")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(
      await screen.findByText("Já existe um documento com este título.")
    ).toBeTruthy()
  })

  it("erro lançado vira o erro geral e o formulário continua editável", async () => {
    page({
      onSubmit: () => {
        throw new Error("O servidor não respondeu.")
      },
    })
    await fill("Contrato", "ana@exemplo.com")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("O servidor não respondeu.")
    expect(
      (screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement)
        .disabled
    ).toBe(false)
  })

  it("avisa o pai quando o formulário fica sujo", async () => {
    const onDirtyChange = vi.fn()
    page({ onDirtyChange })
    await userEvent.type(screen.getByLabelText("Título"), "a")
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true))
  })
})

function SheetHarness({
  onOpenChange,
}: {
  onOpenChange?: (o: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <EntityForm<Values>
      presentation="sheet"
      open={open}
      onOpenChange={(next) => {
        onOpenChange?.(next)
        setOpen(next)
      }}
      title="Novo documento"
      schema={schema}
      defaultValues={{ title: "", author: "" }}
      fields={fields}
      onSubmit={() => undefined}
    />
  )
}

describe("EntityForm dentro de um Sheet", () => {
  it("sem alterações, fechar não pergunta nada", async () => {
    const onOpenChange = vi.fn()
    render(<SheetHarness onOpenChange={onOpenChange} />)
    await screen.findByRole("dialog")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("com alterações, fechar pede confirmação e o Sheet continua aberto", async () => {
    const onOpenChange = vi.fn()
    render(<SheetHarness onOpenChange={onOpenChange} />)
    await userEvent.type(await screen.findByLabelText("Título"), "Rascunho")

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    const warning = await screen.findByRole("alertdialog")
    expect(within(warning).getByText("Descartar as alterações?")).toBeTruthy()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)

    // continuar editando: o texto digitado segue lá
    await userEvent.click(
      within(warning).getByRole("button", { name: "Continuar editando" })
    )
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe(
      "Rascunho"
    )
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it("Esc com alterações também pergunta; descartar fecha e limpa o formulário", async () => {
    const onOpenChange = vi.fn()
    render(<SheetHarness onOpenChange={onOpenChange} />)
    await userEvent.type(await screen.findByLabelText("Título"), "Rascunho")

    await userEvent.keyboard("{Escape}")
    const warning = await screen.findByRole("alertdialog")
    expect(onOpenChange).not.toHaveBeenCalledWith(false)

    await userEvent.click(
      within(warning).getByRole("button", { name: "Descartar" })
    )
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("salvar com sucesso fecha o Sheet sem avisar de alterações", async () => {
    const onOpenChange = vi.fn()
    render(<SheetHarness onOpenChange={onOpenChange} />)
    const title = await screen.findByLabelText("Título")
    await userEvent.type(title, "Contrato")
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.com")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})
