// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DetailPage } from "@registry/detail-page/detail-page"
import type { DetailPageProps } from "@registry/detail-page/detail-page"

afterEach(cleanup)

function setup(props: Partial<DetailPageProps> = {}) {
  const onConfirm = vi.fn()
  const onEdit = vi.fn()
  const onTabChange = vi.fn()
  render(
    <DetailPage
      title="Contrato de serviço"
      badges={<span>Indexado</span>}
      summary={[{ label: "Autor", value: "Ana Souza" }]}
      primaryAction={{ label: "Abrir arquivo", href: "/arquivo/1" }}
      secondaryActions={[{ label: "Editar", onClick: onEdit }]}
      destructiveAction={{ label: "Excluir documento", onConfirm }}
      tabs={[
        { value: "overview", label: "Visão geral", content: <p>Conteúdo A</p> },
        { value: "versions", label: "Versões", content: <p>Conteúdo B</p> },
      ]}
      onTabChange={onTabChange}
      metadata={[{ label: "Tipo", value: "PDF" }]}
      {...props}
    />
  )
  return { onConfirm, onEdit, onTabChange }
}

describe("DetailPage", () => {
  it("cabeçalho: título, marcas, resumo e ação primária como link", () => {
    setup()
    expect(
      screen.getByRole("heading", { level: 1, name: "Contrato de serviço" })
    ).toBeTruthy()
    expect(screen.getByText("Indexado")).toBeTruthy()
    expect(screen.getByText("Ana Souza")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "Abrir arquivo" }).getAttribute("href")
    ).toBe("/arquivo/1")
  })

  it("usa o componente de link injetado na ação primária", () => {
    const Link = ({ href, ...props }: { href: string }) => (
      <a data-router-link href={href} {...props} />
    )
    setup({ linkComponent: Link })
    expect(
      screen
        .getByRole("link", { name: "Abrir arquivo" })
        .hasAttribute("data-router-link")
    ).toBe(true)
  })

  it("ação secundária fica no menu e roda ao escolher", async () => {
    const { onEdit } = setup()
    expect(screen.queryByRole("menuitem", { name: "Editar" })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Mais ações" }))
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Editar" })
    )
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it("ação destrutiva pede confirmação e só roda ao confirmar", async () => {
    const { onConfirm } = setup()
    await userEvent.click(screen.getByRole("button", { name: "Mais ações" }))
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Excluir documento" })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancelar" })
    )
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Mais ações" }))
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Excluir documento" })
    )
    const again = await screen.findByRole("alertdialog")
    await userEvent.click(
      within(again).getByRole("button", { name: "Excluir documento" })
    )
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("abas: mostra a primeira, troca ao clicar e avisa o pai", async () => {
    const { onTabChange } = setup()
    expect(screen.getByText("Conteúdo A")).toBeTruthy()
    await userEvent.click(screen.getByRole("tab", { name: "Versões" }))
    expect(onTabChange).toHaveBeenCalledWith("versions")
    expect(screen.getByText("Conteúdo B")).toBeTruthy()
  })

  it("o painel de metadados vem depois do conteúdo (desce no celular)", () => {
    setup()
    const content = screen.getByText("Conteúdo A")
    const aside = screen.getByRole("complementary", { name: "Detalhes" })
    expect(within(aside).getByText("PDF")).toBeTruthy()
    expect(
      content.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("estados: carregando, erro com tentar de novo e não encontrado", async () => {
    const onRetry = vi.fn()
    const { unmount } = render(<DetailPage title="x" status="loading" />)
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe("true")
    unmount()

    const second = render(
      <DetailPage title="x" status="error" onRetry={onRetry} />
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar de novo" })
    )
    expect(onRetry).toHaveBeenCalledOnce()
    second.unmount()

    render(<DetailPage title="x" status="not-found" />)
    expect(screen.getByText("Não encontrado")).toBeTruthy()
  })
})
