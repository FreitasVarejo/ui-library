import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetTitle,
} from "@registry/sheet"
import type { SheetSide } from "@registry/sheet"
import { Section, Specimen } from "../section"

/**
 * O voltar do aparelho é uma peça do roteador, e a vitrine não tem um. Esta
 * monta e desmonta como a de verdade e conta quantas estão no ar: com duas
 * folhas abertas, o número tem de ser 1.
 */
function CountedGuard({ onChange }: { onChange: (delta: number) => void }) {
  useEffect(() => {
    onChange(1)
    return () => onChange(-1)
  }, [onChange])
  return null
}

const SIDES: { side: SheetSide; label: string }[] = [
  { side: "bottom", label: "Embaixo" },
  { side: "right", label: "Direita" },
  { side: "left", label: "Esquerda" },
  { side: "top", label: "Em cima" },
]

export function SheetPage() {
  const [confirm, setConfirm] = useState(false)
  const [side, setSide] = useState<SheetSide | null>(null)
  const [stack, setStack] = useState<"none" | "one" | "two">("none")
  const [sibling, setSibling] = useState(false)
  const [locked, setLocked] = useState(false)
  const [dismissible, setDismissible] = useState(false)
  const [last, setLast] = useState("nenhuma ação ainda")
  const [guards, setGuards] = useState(0)
  const countGuards = (delta: number) => setGuards((n) => n + delta)

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Folha de baixo"
        description="O uso de uma confirmação: título, texto e os botões empilhados. Esc fecha; o foco volta ao botão que abriu."
      >
        <Specimen label="Sheet com SheetTitle e SheetDescription">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setConfirm(true)}>
              Fechar a chamada
            </Button>
            <span className="text-sm text-muted-foreground" role="status">
              Última ação: {last}
            </span>
          </div>
          <Sheet
            open={confirm}
            onOpenChange={(open) => !open && setConfirm(false)}
          >
            <SheetTitle>Fechar a chamada?</SheetTitle>
            <SheetDescription>
              Os 12 presentes ficam registrados e a lista não muda mais.
            </SheetDescription>
            <div className="mt-2 flex flex-col gap-2">
              <Button
                size="lg"
                onClick={() => {
                  setLast("chamada fechada")
                  setConfirm(false)
                }}
              >
                Fechar
              </Button>
              <SheetClose render={<Button size="lg" variant="ghost" />}>
                Voltar
              </SheetClose>
            </div>
          </Sheet>
        </Specimen>
      </Section>

      <Section
        title="Lados"
        description="A borda de onde a folha sai. O padrão é embaixo."
      >
        <Specimen label="side">
          <div className="flex flex-wrap gap-2">
            {SIDES.map((item) => (
              <Button
                key={item.side}
                variant="outline"
                onClick={() => setSide(item.side)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Sheet
            open={side !== null}
            side={side ?? "bottom"}
            onOpenChange={(open) => !open && setSide(null)}
          >
            <SheetTitle>Folha {side}</SheetTitle>
            <SheetDescription>
              Sai da borda escolhida e fecha com Esc ou pelo botão.
            </SheetDescription>
            <SheetClose render={<Button variant="outline" />}>
              Fechar
            </SheetClose>
          </Sheet>
        </Specimen>
      </Section>

      <Section
        title="Pilha"
        description="Só a de cima responde: Esc fecha uma por vez, e o backGuard existe só nela. Fechada a de cima, o foco volta ao botão da de baixo que a abriu."
      >
        <Specimen label="uma folha dentro da outra, e uma irmã aberta por fora">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setStack("one")}>
              Abrir a folha da aula
            </Button>
            <span className="text-sm text-muted-foreground" role="status">
              backGuards montados: {guards}
            </span>
          </div>
          <Sheet
            open={stack !== "none"}
            onOpenChange={(open) => !open && setStack("none")}
            backGuard={<CountedGuard onChange={countGuards} />}
          >
            <SheetTitle>Folha da aula</SheetTitle>
            <SheetDescription>
              Abra a foto por cima e aperte Esc duas vezes.
            </SheetDescription>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStack("two")}>
                Ampliar a foto
              </Button>
              <Button variant="outline" onClick={() => setSibling(true)}>
                Abrir uma pergunta por cima
              </Button>
              <SheetClose render={<Button variant="ghost" />}>
                Depois
              </SheetClose>
            </div>
            <Sheet
              open={stack === "two"}
              onOpenChange={(open) => !open && setStack("one")}
              backGuard={<CountedGuard onChange={countGuards} />}
              side="right"
            >
              <SheetTitle>Foto da turma</SheetTitle>
              <SheetClose render={<Button variant="outline" />}>
                Fechar a foto
              </SheetClose>
            </Sheet>
          </Sheet>
          <Sheet
            open={sibling}
            onOpenChange={(open) => !open && setSibling(false)}
            backGuard={<CountedGuard onChange={countGuards} />}
          >
            <SheetTitle>Pergunta por cima</SheetTitle>
            <SheetDescription>
              Uma folha irmã, montada fora da primeira: o Esc também fecha só
              esta.
            </SheetDescription>
            <SheetClose render={<Button variant="outline" />}>
              Fechar
            </SheetClose>
          </Sheet>
        </Specimen>
      </Section>

      <Section
        title="Sem como fechar"
        description="Sem onOpenChange, Esc, toque fora e arrasto não fazem nada: a pergunta que a pessoa precisa responder."
      >
        <Specimen label="onOpenChange ausente">
          <Button variant="outline" onClick={() => setLocked(true)}>
            Fazer a pergunta
          </Button>
          <Sheet open={locked}>
            <SheetTitle>Atribuir o rosto agora?</SheetTitle>
            <SheetDescription>
              Esta pergunta não fecha sozinha. Responda para continuar.
            </SheetDescription>
            <Button onClick={() => setLocked(false)}>Responder</Button>
          </Sheet>
        </Specimen>
      </Section>

      <Section
        title="Toque fora e arrasto"
        description="Desligados por padrão. Ligados, o toque no fundo e o arrasto para baixo fecham a folha."
      >
        <Specimen label="dismissOnOutsidePress e swipeToDismiss">
          <Button variant="outline" onClick={() => setDismissible(true)}>
            Abrir
          </Button>
          <Sheet
            open={dismissible}
            onOpenChange={(open) => !open && setDismissible(false)}
            dismissOnOutsidePress
            swipeToDismiss
          >
            <SheetTitle>Fecha por fora</SheetTitle>
            <SheetDescription>
              Toque no fundo escurecido ou arraste a folha para baixo.
            </SheetDescription>
          </Sheet>
        </Specimen>
      </Section>
    </div>
  )
}
