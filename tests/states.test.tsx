import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { EmptyState } from "@registry/states/empty-state"
import { ErrorState } from "@registry/states/error-state"
import { ForbiddenState } from "@registry/states/forbidden-state"
import { LoadingState } from "@registry/states/loading-state"
import type { LoadingVariant } from "@registry/states/loading-state"
import { NotFoundState } from "@registry/states/not-found-state"

const html = (node: React.ReactElement) => renderToStaticMarkup(node)

describe("LoadingState", () => {
  const variants: LoadingVariant[] = ["list", "table", "cards", "detail"]

  for (const variant of variants) {
    it(`${variant}: região de status anunciada, esqueleto oculto`, () => {
      const markup = html(<LoadingState variant={variant} />)
      expect(markup).toContain('role="status"')
      expect(markup).toContain('aria-live="polite"')
      expect(markup).toContain('aria-busy="true"')
      expect(markup).toContain(`data-variant="${variant}"`)
      expect(markup).toContain('<span class="sr-only">Carregando…</span>')
      expect(markup).toContain('aria-hidden="true"')
      expect(markup).toContain('data-slot="skeleton"')
    })
  }

  it("o texto anunciado é sobrescrevível", () => {
    expect(html(<LoadingState label="Buscando documentos" />)).toContain(
      "Buscando documentos"
    )
  })

  it("as variantes desenham esqueletos diferentes", () => {
    const outputs = new Set(
      variants.map((v) => html(<LoadingState variant={v} />))
    )
    expect(outputs.size).toBe(variants.length)
  })

  it("respeita prefers-reduced-motion", () => {
    expect(html(<LoadingState />)).toContain("motion-reduce:animate-none")
  })
})

describe("ErrorState", () => {
  it("é um alerta e oferece tentar de novo quando há onRetry", () => {
    const markup = html(<ErrorState onRetry={() => undefined} />)
    expect(markup).toContain('role="alert"')
    expect(markup).toContain("Tentar de novo")
  })

  it("sem onRetry não mostra o botão", () => {
    expect(html(<ErrorState />)).not.toContain("<button")
  })

  it("texto e rótulo do botão são sobrescrevíveis", () => {
    const markup = html(
      <ErrorState
        title="Falhou"
        retryLabel="Recarregar"
        onRetry={() => undefined}
      />
    )
    expect(markup).toContain("Falhou")
    expect(markup).toContain("Recarregar")
    expect(markup).not.toContain("Tentar de novo")
  })
})

describe("vazio, 404 e sem permissão", () => {
  it("EmptyState tem texto padrão em pt-BR e aceita ação", () => {
    const markup = html(<EmptyState action={<button>Enviar</button>} />)
    expect(markup).toContain("Nada por aqui")
    expect(markup).toContain("Enviar")
  })

  it("NotFoundState mostra 404 e título como h1 semântico", () => {
    const markup = html(<NotFoundState />)
    expect(markup).toContain("404")
    expect(markup).toContain("Página não encontrada")
    expect(markup).toContain('aria-level="1"')
  })

  it("ForbiddenState mostra 403 e sem permissão", () => {
    const markup = html(<ForbiddenState />)
    expect(markup).toContain("403")
    expect(markup).toContain("Sem permissão")
  })
})
