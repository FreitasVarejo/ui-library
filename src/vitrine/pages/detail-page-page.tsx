import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { DetailPage } from "@registry/detail-page/detail-page"
import type { DetailStatus } from "@registry/detail-page/types"
import { notify } from "@registry/feedback/notify"
import { Icons } from "@/lib/icons"
import { DOCUMENTS, STATUS_LABEL, dateFormat } from "../demo-data"
import { Section } from "../section"

const doc = DOCUMENTS[0]

function Demo({ status = "ready" }: { status?: DetailStatus }) {
  const [tab, setTab] = useState("overview")
  return (
    <DetailPage
      status={status}
      onRetry={() => undefined}
      title={doc.title}
      description="Contrato firmado com o fornecedor de hospedagem."
      badges={<Badge variant="secondary">{STATUS_LABEL[doc.status]}</Badge>}
      summary={[
        { label: "Autor", value: doc.author },
        {
          label: "Atualizado",
          value: dateFormat.format(new Date(doc.updated)),
        },
      ]}
      primaryAction={{
        label: "Abrir arquivo",
        icon: <Icons.file />,
        href: "#arquivo",
      }}
      secondaryActions={[
        {
          label: "Editar",
          icon: <Icons.edit />,
          onClick: () => notify.info("Abriria o formulário de edição"),
        },
        {
          label: "Reindexar",
          icon: <Icons.retry />,
          onClick: () => notify.success("Na fila de indexação"),
        },
      ]}
      destructiveAction={{
        label: "Excluir documento",
        onConfirm: () => {
          notify.success("Documento excluído")
        },
        confirm: {
          title: "Excluir este documento?",
          description: "Ele sai do acervo e da busca. Não dá para desfazer.",
        },
      }}
      tab={tab}
      onTabChange={setTab}
      tabs={[
        {
          value: "overview",
          label: "Visão geral",
          content: (
            <p className="max-w-prose text-sm text-muted-foreground">
              {doc.snippet} O documento tem {doc.pages} página(s) e foi indexado
              sem erros. As abas são controláveis: o pai pode guardar a aba
              atual na URL.
            </p>
          ),
        },
        {
          value: "versions",
          label: "Versões",
          badge: <Badge variant="outline">3</Badge>,
          content: (
            <p className="text-sm text-muted-foreground">
              Histórico de versões do arquivo.
            </p>
          ),
        },
        {
          value: "activity",
          label: "Atividade",
          content: (
            <p className="text-sm text-muted-foreground">
              Quem abriu, editou ou baixou o documento.
            </p>
          ),
        },
      ]}
      metadata={[
        { label: "Tipo", value: doc.type },
        { label: "Páginas", value: String(doc.pages) },
        { label: "Etiquetas", value: doc.tags.join(", ") },
        {
          label: "Identificador",
          value: <code className="font-mono">{doc.id}</code>,
        },
      ]}
    />
  )
}

export function DetailPageDemo() {
  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Detalhe"
        description="Ação primária (link injetável), secundárias no menu, destrutiva com confirmação. O painel lateral desce para baixo do conteúdo no celular."
      >
        <Demo />
      </Section>
      <Section title="Estados">
        <div className="grid gap-4 md:grid-cols-3">
          {(["loading", "error", "not-found"] as const).map((status) => (
            <div key={status} className="rounded-lg border bg-card p-4">
              <p className="mb-2 font-mono text-xs text-muted-foreground">
                {status}
              </p>
              <Demo status={status} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
