import { Button } from "@/components/ui/button"
import { Section } from "../section"
import { useParams } from "../store"
import { setParams } from "../store"

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet 768", width: "768px" },
  { id: "mobile", label: "Celular 390", width: "390px" },
] as const

export function ShellPage() {
  const params = useParams()
  const viewport =
    VIEWPORTS.find((v) => v.id === params.get("viewport")) ?? VIEWPORTS[0]
  const src = new URLSearchParams({
    preview: "app-shell",
    brand: params.get("brand") ?? "default",
    mode: params.get("mode") ?? "light",
  })

  return (
    <Section
      title="app-shell"
      description="Casca real em tela cheia dentro do iframe; a largura troca o layout (barra lateral, Sheet no celular). Ctrl/Cmd+B recolhe."
    >
      <div className="flex flex-wrap gap-2">
        {VIEWPORTS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={item.id === viewport.id ? "default" : "outline"}
            onClick={() => setParams({ viewport: item.id })}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-muted p-2">
        <iframe
          title="Pré-visualização do app-shell"
          src={`?${src}`}
          style={{ width: viewport.width, height: 640 }}
          className="mx-auto block max-w-full rounded-md border bg-background"
        />
      </div>
    </Section>
  )
}
