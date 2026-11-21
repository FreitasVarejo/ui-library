import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Icons } from "@/lib/icons"
import type { IconName } from "@/lib/icons"
import { Section } from "../section"

const SURFACES: Array<[string, string]> = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["popover", "popover-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["muted", "muted-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["disabled", "disabled-foreground"],
  ["sidebar", "sidebar-foreground"],
  ["sidebar-primary", "sidebar-primary-foreground"],
  ["sidebar-accent", "sidebar-accent-foreground"],
]
const LINES = ["border", "input", "ring", "sidebar-border", "sidebar-ring"]
const CHARTS = [1, 2, 3, 4, 5]
const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "link",
  "destructive",
] as const
// Classes literais, para o Tailwind encontrá-las ao varrer o código.
const SHADOWS = [
  ["sm", "shadow-sm"],
  ["md", "shadow-md"],
  ["lg", "shadow-lg"],
] as const

export function ThemePage() {
  return (
    <div className="flex flex-col gap-8">
      <Section title="Cores" description="Tokens do tema, texto sobre fundo.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {SURFACES.map(([bg, fg]) => (
            <div
              key={bg}
              className="flex h-20 flex-col justify-between rounded-lg border p-2 text-xs"
              style={{ background: `var(--${bg})`, color: `var(--${fg})` }}
            >
              <span className="font-mono">{bg}</span>
              <span className="text-sm font-medium">Aa texto</span>
            </div>
          ))}
          <div
            className="flex h-20 items-end rounded-lg border p-2 text-xs"
            style={{
              background: "var(--background)",
              color: "var(--destructive)",
            }}
          >
            <span className="font-mono">destructive</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {LINES.map((name) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <span
                className="size-6 rounded-md border"
                style={{ background: `var(--${name})` }}
              />
              <span className="font-mono">{name}</span>
            </div>
          ))}
          {CHARTS.map((n) => (
            <div key={n} className="flex items-center gap-2 text-xs">
              <span
                className="size-6 rounded-md"
                style={{ background: `var(--chart-${n})` }}
              />
              <span className="font-mono">chart-{n}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Controles"
        description="Repouso e desabilitado; use Tab para ver o anel de foco."
      >
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground">
          {[false, true].map((disabled) => (
            <div key={String(disabled)} className="flex flex-wrap gap-2">
              {VARIANTS.map((variant) => (
                <Button key={variant} variant={variant} disabled={disabled}>
                  {variant}
                </Button>
              ))}
              <Button
                size="icon"
                variant="outline"
                disabled={disabled}
                aria-label="Mais"
              >
                <Icons.plus />
              </Button>
            </div>
          ))}
          <div className="grid gap-3 md:grid-cols-2">
            {[false, true].map((disabled) => (
              <div key={String(disabled)} className="flex flex-col gap-3">
                <Input
                  placeholder="Título"
                  defaultValue="Contrato"
                  disabled={disabled}
                  aria-label={disabled ? "Campo desabilitado" : "Campo"}
                />
                <Textarea
                  placeholder="Descrição"
                  disabled={disabled}
                  aria-label={disabled ? "Texto desabilitado" : "Texto"}
                />
                <Select disabled={disabled} defaultValue="pdf">
                  <SelectTrigger
                    aria-label={disabled ? "Tipo desabilitado" : "Tipo"}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-4">
                  {[false, true].map((checked) => (
                    <div
                      key={String(checked)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={`check-${disabled}-${checked}`}
                        defaultChecked={checked}
                        disabled={disabled}
                      />
                      <Label htmlFor={`check-${disabled}-${checked}`}>
                        {checked ? "Marcado" : "Vazio"}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Tabs defaultValue="um">
            <TabsList>
              <TabsTrigger value="um">Um</TabsTrigger>
              <TabsTrigger value="dois">Dois</TabsTrigger>
              <TabsTrigger value="tres" disabled>
                Três
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <p className="font-heading text-3xl font-semibold">
            Título: Indexador de conteúdo
          </p>
          <p>
            Texto: busca, listas, detalhe, envio e jobs, com a identidade
            escolhida em um só lugar.
          </p>
          <p className="font-mono text-sm">
            mono: GET /api/documentos?q=contrato
          </p>
        </div>
      </Section>

      <Section title="Raio, sombra e espaçamento">
        <div className="flex flex-wrap items-end gap-4">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <div
              key={size}
              className="flex flex-col items-center gap-1 text-xs"
            >
              <div
                className="size-16 border bg-card"
                style={{ borderRadius: `var(--radius-${size})` }}
              />
              <span className="font-mono">radius-{size}</span>
            </div>
          ))}
          {SHADOWS.map(([size, className]) => (
            <div
              key={size}
              className="flex flex-col items-center gap-1 text-xs"
            >
              <div
                className={`size-16 rounded-lg border bg-card ${className}`}
              />
              <span className="font-mono">shadow-{size}</span>
            </div>
          ))}
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex gap-4">
              <div className="h-4 w-4 bg-primary" />
              <div className="h-4 w-8 bg-primary" />
              <div className="h-4 w-16 bg-primary" />
            </div>
            <span className="font-mono">w-4, w-8, w-16 (--spacing)</span>
          </div>
        </div>
      </Section>

      <Section title="Ícones" description="Nomes semânticos de @/lib/icons.">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7">
          {(Object.keys(Icons) as IconName[]).map((name) => {
            const Icon = Icons[name]
            return (
              <li
                key={name}
                className="flex flex-col items-center gap-1 rounded-lg border bg-card p-2 text-xs"
              >
                <Icon className="size-5" />
                <span className="font-mono">{name}</span>
              </li>
            )
          })}
        </ul>
      </Section>
    </div>
  )
}
