import type { ElementType, ReactNode } from "react"

/**
 * Componente de link injetável: recebe `href` e as props de estilo do
 * shadcn. O padrão é `"a"`; com um roteador, passe o `Link` dele.
 */
export type AppLinkComponent = ElementType<{ href: string }>

export interface NavItem {
  title: string
  href: string
  /** Elemento de ícone, ex.: `<Icons.home />` (@/lib/icons). */
  icon?: ReactNode
  active?: boolean
  badge?: ReactNode
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export interface BreadcrumbEntry {
  label: string
  /** O último item da trilha é a página atual e dispensa `href`. */
  href?: string
}

export interface ShellUser {
  name: string
  email?: string
  avatarUrl?: string
}

export interface UserMenuItem {
  label: string
  icon?: ReactNode
  href?: string
  onSelect?: () => void
  destructive?: boolean
}

export interface AppShellLabels {
  navigation: string
  toggleSidebar: string
  breadcrumb: string
  userMenu: string
  skipToContent: string
}

export const DEFAULT_LABELS: AppShellLabels = {
  navigation: "Navegação principal",
  toggleSidebar: "Alternar barra lateral",
  breadcrumb: "Trilha de navegação",
  userMenu: "Menu do usuário",
  skipToContent: "Ir para o conteúdo",
}
