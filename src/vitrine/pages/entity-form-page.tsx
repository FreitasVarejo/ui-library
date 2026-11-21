import { useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { EntityForm } from "@registry/entity-form/entity-form"
import type { EntityFormField } from "@registry/entity-form/types"
import { notify } from "@registry/feedback/notify"
import { Icons } from "@/lib/icons"
import { Section, Specimen } from "../section"

const schema = z.object({
  title: z.string().min(3, "O título precisa de ao menos 3 caracteres."),
  author: z.string().email("Informe um e-mail válido."),
  type: z.string().min(1, "Escolha o tipo."),
  pages: z.number().int().min(1, "Mínimo de 1 página.").optional(),
  notes: z.string().max(200, "No máximo 200 caracteres."),
  published: z.boolean(),
})
type Values = z.infer<typeof schema>

const fields: EntityFormField<Values>[] = [
  { name: "title", label: "Título", placeholder: "Contrato de serviço" },
  {
    name: "author",
    label: "E-mail do autor",
    type: "email",
    autoComplete: "email",
    description: "Quem responde pelo documento.",
  },
  {
    name: "type",
    label: "Tipo",
    type: "select",
    placeholder: "Escolha…",
    options: ["PDF", "DOCX", "Planilha", "Imagem", "E-mail"].map((value) => ({
      value,
      label: value,
    })),
  },
  { name: "pages", label: "Páginas", type: "number" },
  { name: "notes", label: "Observações", type: "textarea" },
  { name: "published", label: "Visível na busca", type: "checkbox" },
]

const defaults: Values = {
  title: "",
  author: "",
  type: "",
  pages: undefined,
  notes: "",
  published: true,
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function EntityFormPage() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"ok" | "field" | "general">("ok")

  async function save(values: Values) {
    await wait(700)
    if (mode === "field")
      return {
        fieldErrors: { title: "Já existe um documento com este título." },
      }
    if (mode === "general") throw new Error("O servidor não respondeu.")
    notify.success(`“${values.title}” salvo`)
  }

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Como página"
        description="Validação do zod em cada campo. Enviar vazio mostra os erros; o botão fica ocupado enquanto salva."
      >
        <div
          className="flex flex-wrap gap-2 text-sm"
          role="group"
          aria-label="Resposta do servidor"
        >
          {(
            [
              ["ok", "Servidor salva"],
              ["field", "Erro no campo"],
              ["general", "Erro geral"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={mode === value ? "default" : "outline"}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Specimen label='presentation="page"' className="max-w-xl">
          <EntityForm
            title="Novo documento"
            description="Preencha os dados para cadastrar."
            schema={schema}
            defaultValues={defaults}
            fields={fields}
            onSubmit={save}
            onCancel={() => notify.info("Cancelado")}
          />
        </Specimen>
      </Section>

      <Section
        title="Dentro de um Sheet"
        description="Fechar com alterações (Esc, fora, X ou Cancelar) pergunta antes de descartar."
      >
        <div>
          <Button onClick={() => setOpen(true)}>
            <Icons.plus data-icon="inline-start" />
            Novo documento
          </Button>
        </div>
        <EntityForm
          presentation="sheet"
          open={open}
          onOpenChange={setOpen}
          title="Novo documento"
          description="Preencha os dados para cadastrar."
          schema={schema}
          defaultValues={defaults}
          fields={fields}
          onSubmit={save}
        />
      </Section>
    </div>
  )
}
