import { useState } from "react"

import {
  CommandPalette,
  CommandPaletteTrigger,
} from "@registry/command-palette/command-palette"
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
} from "@registry/command-palette/types"
import { Icons } from "@/lib/icons"
import { DOCUMENTS } from "../demo-data"
import { Section } from "../section"

/**
 * Busca de mentira. “lento” nunca responde (para ver o carregando),
 * “falha” rejeita; o resto responde em meio segundo.
 */
function searchDocuments(
  query: string,
  { signal }: { signal: AbortSignal },
  pick: (label: string) => void
) {
  return new Promise<CommandPaletteItem[]>((resolve, reject) => {
    if (query.includes("lento")) return
    const timer = setTimeout(() => {
      if (query.includes("falha")) return reject(new Error("falhou"))
      const needle = query.toLowerCase()
      resolve(
        DOCUMENTS.filter((doc) => doc.title.toLowerCase().includes(needle))
          .slice(0, 5)
          .map((doc) => ({
            id: doc.id,
            label: doc.title,
            icon: <Icons.file />,
            onSelect: () => pick(`Documento: ${doc.title}`),
          }))
      )
    }, 500)
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new DOMException("Cancelado", "AbortError"))
    })
  })
}

export function CommandPalettePage() {
  const [last, setLast] = useState<string>()

  const groups: CommandPaletteGroup[] = [
    {
      id: "nav",
      heading: "Navegação",
      items: [
        {
          id: "home",
          label: "Ir para o início",
          icon: <Icons.home />,
          shortcut: "G I",
          onSelect: () => setLast("Início"),
        },
        {
          id: "library",
          label: "Ir para a biblioteca",
          icon: <Icons.folder />,
          shortcut: "G B",
          keywords: ["acervo"],
          onSelect: () => setLast("Biblioteca"),
        },
        {
          id: "jobs",
          label: "Ver jobs",
          icon: <Icons.list />,
          shortcut: "G J",
          onSelect: () => setLast("Jobs"),
        },
      ],
    },
    {
      id: "actions",
      heading: "Ações",
      items: [
        {
          id: "upload",
          label: "Enviar arquivos",
          icon: <Icons.upload />,
          shortcut: "U",
          onSelect: () => setLast("Enviar arquivos"),
        },
        {
          id: "reindex",
          label: "Reindexar o acervo",
          icon: <Icons.retry />,
          onSelect: () => setLast("Reindexar"),
        },
        {
          id: "settings",
          label: "Configurações",
          icon: <Icons.settings />,
          shortcut: "⌘,",
          onSelect: () => setLast("Configurações"),
        },
      ],
    },
    {
      id: "recent",
      heading: "Recentes",
      items: [
        {
          id: "recent-1",
          label: "Contrato de prestação de serviço",
          icon: <Icons.clock />,
          onSelect: () => setLast("Recente: contrato"),
        },
        {
          id: "recent-2",
          label: "Ata da reunião de março",
          icon: <Icons.clock />,
          onSelect: () => setLast("Recente: ata"),
        },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Paleta de comandos"
        description="Abre com Ctrl/Cmd+K ou pelo botão. Digite para filtrar (sem acento); a busca assíncrona acrescenta um grupo “Resultados”: digite um título de documento, “lento” para ver o carregando ou “falha” para ver o erro."
      >
        <div className="flex flex-wrap items-center gap-3">
          <CommandPalette
            groups={groups}
            trigger={<CommandPaletteTrigger />}
            search={(query, context) =>
              searchDocuments(query, context, (label) => setLast(label))
            }
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {last
              ? `Último comando: ${last}`
              : "Nenhum comando escolhido ainda."}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          No item app-shell, a mesma paleta está no cabeçalho (slot actions).
        </p>
      </Section>
    </div>
  )
}
