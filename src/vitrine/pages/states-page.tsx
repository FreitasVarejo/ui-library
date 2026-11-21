import { Button } from "@/components/ui/button"
import { EmptyState } from "@registry/states/empty-state"
import { ErrorState } from "@registry/states/error-state"
import { ForbiddenState } from "@registry/states/forbidden-state"
import { LoadingState } from "@registry/states/loading-state"
import { NotFoundState } from "@registry/states/not-found-state"
import { Icons } from "@/lib/icons"
import { Section, Specimen } from "../section"

export function StatesPage() {
  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Vazio"
        description="Lista ou busca sem resultado; ação opcional."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="padrão">
            <EmptyState />
          </Specimen>
          <Specimen label="com ação e texto próprio">
            <EmptyState
              title="Nenhum documento indexado"
              description="Envie um arquivo para começar a busca."
              action={
                <Button>
                  <Icons.upload data-icon="inline-start" />
                  Enviar arquivo
                </Button>
              }
            />
          </Specimen>
        </div>
      </Section>

      <Section
        title="Erro"
        description="Anunciado como alerta; o botão chama onRetry."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="com tentar de novo">
            <ErrorState onRetry={() => undefined} />
          </Specimen>
          <Specimen label="com detalhe técnico">
            <ErrorState
              title="Falha ao carregar os jobs"
              detail="GET /api/jobs 503 Service Unavailable"
              onRetry={() => undefined}
              retryLabel="Recarregar"
            />
          </Specimen>
        </div>
      </Section>

      <Section
        title="Carregando"
        description="Esqueleto por variante; o leitor de tela ouve só o rótulo."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="list">
            <LoadingState variant="list" />
          </Specimen>
          <Specimen label="table">
            <LoadingState variant="table" />
          </Specimen>
          <Specimen label="cards" className="md:col-span-2">
            <LoadingState variant="cards" count={3} />
          </Specimen>
          <Specimen label="detail" className="md:col-span-2">
            <LoadingState variant="detail" label="Carregando o documento…" />
          </Specimen>
        </div>
      </Section>

      <Section title="404 e sem permissão">
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="NotFoundState">
            <NotFoundState
              action={<Button variant="outline">Voltar ao início</Button>}
            />
          </Specimen>
          <Specimen label="ForbiddenState">
            <ForbiddenState
              action={<Button variant="outline">Pedir acesso</Button>}
            />
          </Specimen>
        </div>
      </Section>
    </div>
  )
}
