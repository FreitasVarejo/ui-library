import { createContext, useContext, useState } from "react"
import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AppShell } from "@registry/app-shell/app-shell"
import type { NavGroup } from "@registry/app-shell/types"
import {
  CommandPalette,
  CommandPaletteTrigger,
} from "@registry/command-palette/command-palette"
import type { CommandPaletteGroup } from "@registry/command-palette/types"
import { EmptyState } from "@registry/states/empty-state"
import { ErrorState } from "@registry/states/error-state"
import { ForbiddenState } from "@registry/states/forbidden-state"
import { LoadingState } from "@registry/states/loading-state"
import { Icons } from "@/lib/icons"
import { DOCUMENTS } from "./demo-data"
import { useParams } from "./store"

// Link injetado no AppShell: troca a "rota" em memória em vez de navegar,
// como um roteador faria.
const NavigateContext = createContext<(path: string) => void>(() => undefined)

function DemoLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  const navigate = useContext(NavigateContext)
  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault()
        navigate(href)
      }}
      {...props}
    />
  )
}

const PAGES: Record<string, { title: string; crumbs: string[] }> = {
  "/": { title: "Início", crumbs: [] },
  "/library": { title: "Biblioteca", crumbs: [] },
  "/uploads": { title: "Envios", crumbs: [] },
  "/jobs": { title: "Jobs", crumbs: [] },
  "/settings": { title: "Configurações", crumbs: [] },
}

function groups(path: string): NavGroup[] {
  const item = (href: string, title: string, icon: React.ReactNode) => ({
    href,
    title,
    icon,
    active: path === href,
  })
  return [
    {
      label: "Conteúdo",
      items: [
        item("/", "Início", <Icons.home />),
        item("/library", "Biblioteca", <Icons.folder />),
        item("/uploads", "Envios", <Icons.upload />),
        { ...item("/jobs", "Jobs", <Icons.list />), badge: "3" },
      ],
    },
    {
      label: "Administração",
      items: [item("/settings", "Configurações", <Icons.settings />)],
    },
  ]
}

function Content({ path }: { path: string }) {
  if (path === "/library") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Páginas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            ["Contrato de prestação de serviço", "PDF", "12"],
            ["Ata da reunião de março", "DOCX", "3"],
            ["Manual do usuário", "PDF", "84"],
          ].map(([name, type, pages]) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
              <TableCell>{type}</TableCell>
              <TableCell className="text-right">{pages}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  if (path === "/uploads") {
    return (
      <EmptyState
        title="Nenhum envio ainda"
        description="Arraste arquivos aqui ou escolha no computador."
        action={
          <Button>
            <Icons.upload data-icon="inline-start" />
            Enviar arquivo
          </Button>
        }
      />
    )
  }
  if (path === "/jobs") return <LoadingState variant="table" />
  if (path === "/settings") return <ForbiddenState />
  if (path === "/erro") return <ErrorState onRetry={() => undefined} />
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[
        ["Documentos", "1.240", "indexados"],
        ["Jobs", "3", "em andamento"],
        ["Buscas", "86", "hoje"],
      ].map(([title, value, note]) => (
        <Card key={title}>
          <CardHeader>
            <CardDescription>{title}</CardDescription>
            <CardTitle className="font-heading text-2xl">{value}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {note}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Paleta do cabeçalho: navegação troca a “rota” em memória; a busca olha os documentos. */
function ShellPalette({ navigate }: { navigate: (path: string) => void }) {
  const groups: CommandPaletteGroup[] = [
    {
      id: "nav",
      heading: "Navegação",
      items: Object.entries(PAGES).map(([path, page]) => ({
        id: path,
        label: `Ir para ${page.title.toLowerCase()}`,
        icon: path === "/jobs" ? <Icons.list /> : <Icons.folder />,
        onSelect: () => navigate(path),
      })),
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
          onSelect: () => navigate("/uploads"),
        },
      ],
    },
  ]
  return (
    <CommandPalette
      groups={groups}
      trigger={<CommandPaletteTrigger />}
      search={async (query) => {
        await new Promise((resolve) => setTimeout(resolve, 300))
        const needle = query.toLowerCase()
        return DOCUMENTS.filter((doc) =>
          doc.title.toLowerCase().includes(needle)
        )
          .slice(0, 5)
          .map((doc) => ({
            id: doc.id,
            label: doc.title,
            icon: <Icons.file />,
            onSelect: () => navigate("/library"),
          }))
      }}
    />
  )
}

/** Tela cheia com o AppShell, para o iframe da vitrine e os screenshots. */
export function ShellPreview() {
  const params = useParams()
  const initial = params.get("path") ?? "/"
  const [path, setPath] = useState(initial)
  const page = PAGES[path] ?? { title: "Erro", crumbs: [] }

  return (
    <NavigateContext value={setPath}>
      <AppShell
        linkComponent={DemoLink}
        groups={groups(path)}
        brand={
          <div className="flex items-center gap-2 px-2 py-1 font-heading font-semibold">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Icons.search className="size-4" />
            </span>
            <span className="truncate">Indexador</span>
          </div>
        }
        breadcrumb={[
          { label: "Início", href: "/" },
          { label: "Acervo", href: "/library" },
          { label: page.title },
        ]}
        user={{ name: "Gabriel Pinheiro", email: "gabriel@exemplo.com" }}
        userMenu={[
          { label: "Perfil", icon: <Icons.user />, href: "/settings" },
          { label: "Sair", icon: <Icons.logout />, destructive: true },
        ]}
        actions={<ShellPalette navigate={setPath} />}
        defaultOpen={params.get("collapsed") !== "1"}
      >
        <h1 className="font-heading text-xl font-semibold">{page.title}</h1>
        <Content path={path} />
      </AppShell>
    </NavigateContext>
  )
}
