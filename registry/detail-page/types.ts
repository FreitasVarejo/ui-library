import type { ElementType, ReactNode } from "react"

/** Link injetável: recebe `href`. Padrão `"a"`; com roteador, o `Link` dele. */
export type DetailLinkComponent = ElementType<{ href: string }>

export interface DetailAction {
  label: string
  /** Elemento de ícone, ex.: `<Icons.edit />` (@/lib/icons). */
  icon?: ReactNode
  /** Com `href`, a ação é um link (pelo `linkComponent`); senão, um botão. */
  href?: string
  onClick?: () => void
  disabled?: boolean
}

export interface DetailDestructiveAction {
  label: string
  icon?: ReactNode
  /** Chamado depois da confirmação; o diálogo fecha quando a promessa resolve. */
  onConfirm: () => void | Promise<void>
  confirm?: {
    title?: ReactNode
    description?: ReactNode
    confirmLabel?: ReactNode
  }
}

export interface DetailTab {
  value: string
  label: ReactNode
  /** Contador ou marca ao lado do nome da aba. */
  badge?: ReactNode
  content: ReactNode
}

export interface DetailMetaItem {
  label: string
  value: ReactNode
}

export type DetailStatus = "ready" | "loading" | "error" | "not-found"

export interface DetailPageLabels {
  moreActions: string
  metadata: string
  loading: string
  errorTitle: string
  errorDescription: string
  retry: string
  notFoundTitle: string
  notFoundDescription: string
}

export const DEFAULT_LABELS: DetailPageLabels = {
  moreActions: "Mais ações",
  metadata: "Detalhes",
  loading: "Carregando…",
  errorTitle: "Não foi possível carregar",
  errorDescription: "Tente de novo em instantes.",
  retry: "Tentar de novo",
  notFoundTitle: "Não encontrado",
  notFoundDescription: "O item não existe ou foi removido.",
}
