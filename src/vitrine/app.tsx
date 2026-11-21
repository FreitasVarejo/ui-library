import { Button } from "@/components/ui/button"
import { AppToaster } from "@registry/feedback/app-toaster"
import { FeedbackPage } from "./pages/feedback-page"
import { ShellPage } from "./pages/shell-page"
import { StatesPage } from "./pages/states-page"
import { ThemePage } from "./pages/theme-page"
import { ShellPreview } from "./preview"
import { BRANDS, setParams, useParams } from "./store"

const ITEMS = [
  { id: "app-shell", label: "app-shell", page: ShellPage },
  { id: "states", label: "states", page: StatesPage },
  { id: "feedback", label: "feedback", page: FeedbackPage },
  { id: "theme", label: "tema", page: ThemePage },
] as const

export function App() {
  const params = useParams()
  if (params.get("preview") === "app-shell") return <ShellPreview />

  const item =
    ITEMS.find((entry) => entry.id === params.get("item")) ?? ITEMS[0]
  const brand = params.get("brand") ?? "default"
  const mode = params.get("mode") === "dark" ? "dark" : "light"
  const Page = item.page

  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-xl font-semibold">
            FreitasVarejo/ui
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              Tema
              <select
                value={brand}
                onChange={(event) => setParams({ brand: event.target.value })}
                className="h-8 rounded-lg border bg-background px-2"
              >
                {BRANDS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-1" role="group" aria-label="Modo">
              {(["light", "dark"] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={mode === value ? "default" : "outline"}
                  aria-pressed={mode === value}
                  onClick={() => setParams({ mode: value })}
                >
                  {value === "light" ? "Claro" : "Escuro"}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <nav aria-label="Itens" className="flex gap-1 overflow-x-auto border-b">
          {ITEMS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setParams({ item: entry.id })}
              aria-current={entry.id === item.id ? "page" : undefined}
              className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground"
            >
              {entry.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1">
        <Page />
      </main>
      <AppToaster />
    </div>
  )
}
