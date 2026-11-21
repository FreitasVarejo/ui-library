import { Fragment } from "react"
import type { ReactNode } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Icons } from "@/lib/icons"
import { DEFAULT_LABELS } from "./types"
import type {
  AppLinkComponent,
  AppShellLabels,
  BreadcrumbEntry,
  NavGroup,
  ShellUser,
  UserMenuItem,
} from "./types"
import { UserMenu } from "./user-menu"

export interface AppShellProps {
  /** Grupos de navegação da barra lateral. */
  groups: NavGroup[]
  /** Marca no topo da barra lateral (logo e nome). */
  brand?: ReactNode
  /** Rodapé da barra lateral. */
  footer?: ReactNode
  /** Trilha do cabeçalho; o último item é a página atual. */
  breadcrumb?: BreadcrumbEntry[]
  user?: ShellUser
  userMenu?: UserMenuItem[]
  /** Ações do cabeçalho, à esquerda do menu do usuário. */
  actions?: ReactNode
  /** Componente de link (padrão `"a"`); passe o `Link` do roteador. */
  linkComponent?: AppLinkComponent
  /** Textos de acessibilidade, todos sobrescrevíveis. */
  labels?: Partial<AppShellLabels>
  defaultOpen?: boolean
  /** Slot de conteúdo. */
  children: ReactNode
}

function SidebarToggle({ label }: { label: string }) {
  const { toggleSidebar } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={toggleSidebar}
    >
      <Icons.sidebar />
    </Button>
  )
}

function Trail({
  entries,
  label,
  linkComponent: Link,
}: {
  entries: BreadcrumbEntry[]
  label: string
  linkComponent: AppLinkComponent
}) {
  return (
    <Breadcrumb aria-label={label} className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {entries.map((entry, index) => {
          const last = index === entries.length - 1
          return (
            <Fragment key={`${entry.label}-${index}`}>
              <BreadcrumbItem className="min-w-0">
                {last || !entry.href ? (
                  <BreadcrumbPage className="truncate">
                    {entry.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="truncate"
                    render={<Link href={entry.href} />}
                  >
                    {entry.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {last ? null : <BreadcrumbSeparator />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/**
 * Casca de aplicação: barra lateral recolhível em modo ícone (Sheet no
 * celular, atalho Ctrl/Cmd+B do próprio componente), cabeçalho com
 * breadcrumb e menu do usuário, e o slot de conteúdo.
 */
export function AppShell({
  groups,
  brand,
  footer,
  breadcrumb,
  user,
  userMenu,
  actions,
  linkComponent = "a",
  labels,
  defaultOpen = true,
  children,
}: AppShellProps) {
  const text = { ...DEFAULT_LABELS, ...labels }
  const Link = linkComponent
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
        >
          {text.skipToContent}
        </a>
        <Sidebar collapsible="icon">
          {brand ? <SidebarHeader>{brand}</SidebarHeader> : null}
          <SidebarContent>
            <nav aria-label={text.navigation} className="flex flex-col gap-2">
              {groups.map((group, index) => (
                <SidebarGroup key={group.label ?? index}>
                  {group.label ? (
                    <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  ) : null}
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            isActive={item.active}
                            tooltip={item.title}
                            aria-current={item.active ? "page" : undefined}
                            render={<Link href={item.href} />}
                          >
                            {item.icon}
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                          {item.badge ? (
                            <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                          ) : null}
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </nav>
          </SidebarContent>
          {footer ? <SidebarFooter>{footer}</SidebarFooter> : null}
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
            <SidebarToggle label={text.toggleSidebar} />
            <Separator orientation="vertical" className="my-auto h-4" />
            {breadcrumb && breadcrumb.length > 0 ? (
              <Trail
                entries={breadcrumb}
                label={text.breadcrumb}
                linkComponent={Link}
              />
            ) : null}
            <div className="ml-auto flex items-center gap-1">
              {actions}
              {user ? (
                <UserMenu
                  user={user}
                  items={userMenu}
                  label={text.userMenu}
                  linkComponent={Link}
                />
              ) : null}
            </div>
          </header>
          <div id="conteudo" className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
