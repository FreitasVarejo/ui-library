// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ConfirmDestructive,
  useConfirmDestructive,
} from "@registry/feedback/confirm-destructive"

afterEach(cleanup)

describe("ConfirmDestructive", () => {
  it("abre com o foco em Cancelar e confirma com o botão destrutivo", async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDestructive
        open
        onOpenChange={() => undefined}
        onConfirm={onConfirm}
      />
    )
    const cancel = await screen.findByRole("button", { name: "Cancelar" })
    const confirm = screen.getByRole("button", { name: "Excluir" })
    await vi.waitFor(() => expect(document.activeElement).toBe(cancel))
    // o botão destrutivo usa o token destructive do tema
    expect(confirm.className).toContain("text-destructive")
    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("o hook resolve true ao confirmar e false ao cancelar", async () => {
    let api!: ReturnType<typeof useConfirmDestructive>
    function Harness() {
      api = useConfirmDestructive()
      return api.dialog
    }
    render(<Harness />)

    let result!: Promise<boolean>
    act(() => {
      result = api.confirm({ title: "Apagar tudo?", confirmLabel: "Apagar" })
    })
    await userEvent.click(await screen.findByRole("button", { name: "Apagar" }))
    await expect(result).resolves.toBe(true)

    act(() => {
      result = api.confirm({ title: "Apagar de novo?" })
    })
    await userEvent.click(
      await screen.findByRole("button", { name: "Cancelar" })
    )
    await expect(result).resolves.toBe(false)
  })
})
