import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  ConfirmDestructive,
  useConfirmDestructive,
} from "@registry/feedback/confirm-destructive"
import { notify } from "@registry/feedback/notify"
import { Section, Specimen } from "../section"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function FeedbackPage() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState("nenhuma ação ainda")
  const { confirm, dialog } = useConfirmDestructive()

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Toasts"
        description="notify.* sobre o sonner do shadcn; <AppToaster /> está montado na raiz da vitrine."
      >
        <Specimen label="notify">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => notify.success("Documento salvo")}
            >
              Sucesso
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                notify.error("Não foi possível salvar", {
                  description: "O servidor não respondeu.",
                })
              }
            >
              Erro
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                notify.undo("Documento arquivado", {
                  onUndo: () => notify.success("Arquivamento desfeito"),
                })
              }
            >
              Com desfazer
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                notify.promise(
                  wait(1500).then(() => "ok"),
                  {
                    loading: "Indexando…",
                    success: "Indexação concluída",
                  }
                )
              }
            >
              Promessa (ok)
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                notify.promise(
                  wait(1500).then(() => {
                    throw new Error("falhou")
                  }),
                  { loading: "Indexando…", error: "A indexação falhou" }
                )
              }
            >
              Promessa (falha)
            </Button>
          </div>
        </Specimen>
      </Section>

      <Section
        title="Confirmação destrutiva"
        description="Sobre alert-dialog: botão destructive, foco inicial em Cancelar."
      >
        <Specimen label="componente e hook">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" onClick={() => setOpen(true)}>
                Excluir (componente)
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Excluir o índice?",
                    description:
                      "Os 1.240 documentos saem da busca. Esta ação não pode ser desfeita.",
                    confirmLabel: "Excluir índice",
                  })
                  setLast(ok ? "hook: confirmado" : "hook: cancelado")
                }}
              >
                Excluir (hook)
              </Button>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              resultado: {last}
            </p>
          </div>
          <ConfirmDestructive
            open={open}
            onOpenChange={setOpen}
            onConfirm={async () => {
              await wait(600)
              setLast("componente: confirmado")
              notify.success("Documento excluído")
            }}
          />
          {dialog}
        </Specimen>
      </Section>
    </div>
  )
}
