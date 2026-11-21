// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FileUpload } from "@registry/file-upload/file-upload"
import type { UploadContext } from "@registry/file-upload/types"
import { formatBytes } from "@registry/file-upload/types"
import { validateFile } from "@registry/file-upload/validate"

afterEach(cleanup)

const file = (name: string, size = 10, type = "") => {
  const result = new File(["x"], name, { type })
  Object.defineProperty(result, "size", { value: size })
  return result
}

/** Envios que ficam pendentes até o teste resolver, rejeitar ou cancelar. */
function controlledUpload() {
  const calls: Array<
    UploadContext & {
      file: File
      resolve: (value?: unknown) => void
      reject: (reason: unknown) => void
    }
  > = []
  const upload = vi.fn(
    (target: File, context: UploadContext) =>
      new Promise<unknown>((resolve, reject) => {
        calls.push({ ...context, file: target, resolve, reject })
      })
  )
  return { upload, calls }
}

// `applyAccept: false`: o jsdom filtraria por `accept` antes do nosso código; o
// arrastar-e-soltar não passa por esse filtro do navegador.
const user = () => userEvent.setup({ applyAccept: false })

function fileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement
}

describe("validateFile", () => {
  it("aceita por extensão, MIME exato e curinga, sem diferenciar caixa", () => {
    const rules = { accept: [".pdf", "image/*", "text/csv"] }
    expect(validateFile(file("a.PDF"), rules)).toBeNull()
    expect(validateFile(file("a.bin", 1, "image/png"), rules)).toBeNull()
    expect(validateFile(file("a.bin", 1, "text/csv"), rules)).toBeNull()
    expect(
      validateFile(file("a.exe", 1, "application/x-msdownload"), rules)
    ).toBe("type")
    // "image/*" não casa "imagem/x", e ".pdf" não casa "pdf" sem ponto no nome
    expect(validateFile(file("a.bin", 1, "imagem/x"), rules)).toBe("type")
    expect(validateFile(file("relatorio-pdf"), rules)).toBe("type")
    // o curinga casa o começo do tipo, não um pedaço qualquer dele
    expect(validateFile(file("a.bin", 1, "x-image/png"), rules)).toBe("type")
  })

  it("rejeita acima do tamanho máximo, mas aceita o limite exato", () => {
    expect(validateFile(file("a.pdf", 1001), { maxSize: 1000 })).toBe("size")
    expect(validateFile(file("a.pdf", 1000), { maxSize: 1000 })).toBeNull()
  })

  it("sem regras aceita tudo; o tipo é checado antes do tamanho", () => {
    expect(validateFile(file("qualquer.coisa", 1e9), {})).toBeNull()
    expect(
      validateFile(file("a.exe", 5000), { accept: [".pdf"], maxSize: 10 })
    ).toBe("type")
  })

  it("formatBytes escolhe a unidade", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(2048)).toBe("2 KB")
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB")
  })
})

describe("FileUpload: validação por arquivo", () => {
  it("mostra a mensagem de cada arquivo recusado e não envia só esses", async () => {
    const { upload, calls } = controlledUpload()
    const { container } = render(
      <FileUpload upload={upload} accept={[".pdf"]} maxSize={1024} />
    )
    await user().upload(fileInput(container), [
      file("ok.pdf", 100),
      file("virus.exe", 100),
      file("grande.pdf", 4096),
    ])

    expect(upload).toHaveBeenCalledTimes(1)
    expect(calls[0].file.name).toBe("ok.pdf")

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(items[1].textContent).toContain("virus.exe")
    expect(items[1].textContent).toContain("Tipo não aceito. Use: .pdf.")
    expect(items[2].textContent).toContain("grande.pdf")
    expect(items[2].textContent).toContain("Arquivo de 4 KB; o máximo é 1 KB.")
    // recusado não tem “tentar de novo”, só remover
    expect(
      screen.queryByRole("button", { name: /Tentar de novo virus/ })
    ).toBeNull()
    await user().click(
      screen.getByRole("button", { name: "Remover virus.exe da lista" })
    )
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("aceita arquivos soltos na zona (drop) e valida igual", () => {
    const { upload } = controlledUpload()
    const { container } = render(
      <FileUpload upload={upload} accept={[".pdf"]} />
    )
    const zone = container.querySelector('[data-slot="file-upload-dropzone"]')!
    fireEvent.drop(zone, {
      dataTransfer: { files: [file("solto.pdf"), file("solto.txt")] },
    })
    expect(upload).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Tipo não aceito. Use: .pdf.")).toBeTruthy()
  })

  it("sem `multiple`, só o primeiro arquivo entra", async () => {
    const { upload } = controlledUpload()
    const { container } = render(
      <FileUpload upload={upload} multiple={false} />
    )
    await user().upload(fileInput(container), [file("a.pdf"), file("b.pdf")])
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
  })
})

describe("FileUpload: progresso, cancelar e sinal", () => {
  it("mostra o % que o envio informa e conclui com o resultado", async () => {
    const { upload, calls } = controlledUpload()
    const onUploaded = vi.fn()
    const { container } = render(
      <FileUpload upload={upload} onUploaded={onUploaded} />
    )
    await user().upload(fileInput(container), [file("a.pdf")])

    act(() => calls[0].onProgress(42))
    const bar = screen.getByRole("progressbar", {
      name: "Progresso do envio de a.pdf",
    })
    expect(bar.getAttribute("aria-valuenow")).toBe("42")
    expect(screen.getByText("Enviando 42%")).toBeTruthy()

    // fora da faixa é cortado
    act(() => calls[0].onProgress(250))
    expect(screen.getByText("Enviando 100%")).toBeTruthy()

    await act(async () => calls[0].resolve({ id: 7 }))
    expect(screen.getByText("Concluído")).toBeTruthy()
    expect(screen.queryByRole("progressbar")).toBeNull()
    expect(onUploaded).toHaveBeenCalledWith(expect.any(File), { id: 7 })
  })

  it("cancelar aborta o signal, marca cancelado e ignora o que chegar depois", async () => {
    const { upload, calls } = controlledUpload()
    const onUploaded = vi.fn()
    const { container } = render(
      <FileUpload upload={upload} onUploaded={onUploaded} />
    )
    await user().upload(fileInput(container), [file("a.pdf")])
    expect(calls[0].signal.aborted).toBe(false)

    await user().click(
      screen.getByRole("button", { name: "Cancelar o envio de a.pdf" })
    )
    expect(calls[0].signal.aborted).toBe(true)
    expect(screen.getByText("Cancelado")).toBeTruthy()

    // o envio ignorou o signal e terminou mesmo assim: a fila não muda
    act(() => calls[0].onProgress(80))
    await act(async () => calls[0].resolve("tarde"))
    expect(screen.getByText("Cancelado")).toBeTruthy()
    expect(screen.queryByText("Concluído")).toBeNull()
    expect(onUploaded).not.toHaveBeenCalled()
  })

  it("remover um envio em andamento também aborta o signal", async () => {
    const { upload, calls } = controlledUpload()
    const { container } = render(<FileUpload upload={upload} />)
    await user().upload(fileInput(container), [file("a.pdf")])
    // em andamento só há “cancelar”; cancelar e depois remover
    await user().click(
      screen.getByRole("button", { name: "Cancelar o envio de a.pdf" })
    )
    await user().click(
      screen.getByRole("button", { name: "Remover a.pdf da lista" })
    )
    expect(calls[0].signal.aborted).toBe(true)
    expect(screen.queryByRole("listitem")).toBeNull()
  })

  it("desmontar com envio em andamento aborta o signal", async () => {
    const { upload, calls } = controlledUpload()
    const { container, unmount } = render(<FileUpload upload={upload} />)
    await user().upload(fileInput(container), [file("a.pdf")])
    unmount()
    expect(calls[0].signal.aborted).toBe(true)
  })
})

describe("FileUpload: erro e tentar de novo", () => {
  it("erro mostra a mensagem, e tentar de novo reenvia o mesmo arquivo", async () => {
    const { upload, calls } = controlledUpload()
    const { container } = render(<FileUpload upload={upload} />)
    await user().upload(fileInput(container), [file("a.pdf")])

    await act(async () => calls[0].reject(new Error("Servidor fora do ar")))
    expect(screen.getByText("Servidor fora do ar")).toBeTruthy()
    expect(screen.queryByRole("progressbar")).toBeNull()

    await user().click(
      screen.getByRole("button", { name: "Tentar de novo a.pdf" })
    )
    expect(upload).toHaveBeenCalledTimes(2)
    expect(calls[1].file).toBe(calls[0].file)
    expect(calls[1].signal.aborted).toBe(false)
    expect(screen.queryByText("Servidor fora do ar")).toBeNull()

    await act(async () => calls[1].resolve())
    expect(screen.getByText("Concluído")).toBeTruthy()
  })

  it("erro sem mensagem usa o texto padrão; cancelado também pode tentar de novo", async () => {
    const { upload, calls } = controlledUpload()
    const { container } = render(<FileUpload upload={upload} />)
    await user().upload(fileInput(container), [file("a.pdf"), file("b.pdf")])
    await act(async () => calls[0].reject("falha sem Error"))
    expect(screen.getByText("O envio falhou.")).toBeTruthy()

    await user().click(
      screen.getByRole("button", { name: "Cancelar o envio de b.pdf" })
    )
    await user().click(
      screen.getByRole("button", { name: "Tentar de novo b.pdf" })
    )
    expect(upload).toHaveBeenCalledTimes(3)
    expect(calls[2].file.name).toBe("b.pdf")
  })
})

describe("FileUpload: limite de envios simultâneos", () => {
  it("só `concurrency` arquivos enviam; o resto espera e entra quando uma vaga abre", async () => {
    const { upload, calls } = controlledUpload()
    const { container } = render(<FileUpload upload={upload} concurrency={2} />)
    await user().upload(fileInput(container), [
      file("1.pdf"),
      file("2.pdf"),
      file("3.pdf"),
      file("4.pdf"),
    ])
    expect(upload).toHaveBeenCalledTimes(2)
    expect(screen.getAllByText("Aguardando")).toHaveLength(2)

    await act(async () => calls[0].resolve())
    expect(upload).toHaveBeenCalledTimes(3)
    expect(calls[2].file.name).toBe("3.pdf")
    expect(screen.getAllByText("Aguardando")).toHaveLength(1)

    // um erro também libera a vaga
    await act(async () => calls[1].reject(new Error("x")))
    expect(upload).toHaveBeenCalledTimes(4)
    expect(screen.queryByText("Aguardando")).toBeNull()
  })

  it("cancelar um que está enviando libera a vaga na hora", async () => {
    const { upload } = controlledUpload()
    const { container } = render(<FileUpload upload={upload} concurrency={1} />)
    await user().upload(fileInput(container), [file("1.pdf"), file("2.pdf")])
    expect(upload).toHaveBeenCalledTimes(1)
    await user().click(
      screen.getByRole("button", { name: "Cancelar o envio de 1.pdf" })
    )
    expect(upload).toHaveBeenCalledTimes(2)
  })

  it("com concurrency 1 os envios são em série", async () => {
    const { upload, calls } = controlledUpload()
    const { container } = render(<FileUpload upload={upload} concurrency={1} />)
    await user().upload(fileInput(container), [file("1.pdf"), file("2.pdf")])
    expect(upload).toHaveBeenCalledTimes(1)
    await act(async () => calls[0].resolve())
    expect(upload).toHaveBeenCalledTimes(2)
  })
})

describe("FileUpload: leitor de tela", () => {
  it("anuncia a entrada e o fim da fila, mas não cada porcentagem", async () => {
    const { upload, calls } = controlledUpload()
    const { container } = render(
      <FileUpload upload={upload} accept={[".pdf"]} />
    )
    const status = container.querySelector('[role="status"]')!
    expect(status.textContent).toBe("")

    await user().upload(fileInput(container), [file("a.pdf"), file("b.txt")])
    expect(status.textContent).toBe("1 arquivo adicionado; 1 recusado.")

    const before = status.textContent
    for (const percent of [10, 20, 30, 60, 90]) {
      act(() => calls[0].onProgress(percent))
      expect(status.textContent).toBe(before)
    }

    await act(async () => calls[0].resolve())
    expect(status.textContent).toBe("Envios terminados: 1 enviado.")
  })

  it("a dropzone é um label ligado ao campo de arquivo: o teclado chega nele", () => {
    const { upload } = controlledUpload()
    const { container } = render(<FileUpload upload={upload} />)
    const zone = container.querySelector('[data-slot="file-upload-dropzone"]')!
    expect(zone.tagName).toBe("LABEL")
    expect(zone.contains(fileInput(container))).toBe(true)
    expect(fileInput(container).tabIndex).toBe(0)
  })

  it("desabilitado usa o par de tokens, sem opacidade, e o foco é contorno sólido", () => {
    const { upload } = controlledUpload()
    const { container } = render(<FileUpload upload={upload} disabled />)
    const zone = container.querySelector('[data-slot="file-upload-dropzone"]')!
    expect(zone.className).toContain("bg-disabled")
    expect(zone.className).toContain("text-disabled-foreground")
    expect(zone.className).not.toContain("opacity")
    expect(zone.getAttribute("data-disabled")).toBe("true")
    expect(fileInput(container).disabled).toBe(true)
    expect(zone.className).toContain("has-[input:focus-visible]:outline-2")
    expect(zone.className).not.toContain("ring-3")
  })
})
