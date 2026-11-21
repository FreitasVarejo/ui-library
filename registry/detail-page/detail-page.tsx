import { useState } from "react"
import type { ReactNode } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDestructive } from "@/components/feedback"
import { ErrorState, LoadingState, NotFoundState } from "@/components/states"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"

import { DEFAULT_LABELS } from "./types"
import type {
  DetailAction,
  DetailDestructiveAction,
  DetailLinkComponent,
  DetailMetaItem,
  DetailPageLabels,
  DetailStatus,
  DetailTab,
} from "./types"

export interface DetailPageProps {
  title: ReactNode
  description?: ReactNode
  /** Marcas ao lado do título (situação, tipo…). */
  badges?: ReactNode
  /** Metadados em linha, sob o título. */
  summary?: DetailMetaItem[]

  primaryAction?: DetailAction
  /** Vão num menu “Mais ações”. */
  secondaryActions?: DetailAction[]
  /** Último item do menu, em cor destrutiva, com confirmação. */
  destructiveAction?: DetailDestructiveAction

  /** Abas. Sem abas, o conteúdo é `children`. */
  tabs?: DetailTab[]
  tab?: string
  defaultTab?: string
  onTabChange?: (tab: string) => void
  children?: ReactNode

  /** Painel lateral de metadados; desce para baixo do conteúdo no celular. */
  metadata?: DetailMetaItem[]
  metadataTitle?: string
  /** Conteúdo extra no painel lateral, sob os metadados. */
  aside?: ReactNode

  status?: DetailStatus
  onRetry?: () => void
  linkComponent?: DetailLinkComponent
  labels?: Partial<DetailPageLabels>
  className?: string
}

function ActionButton({
  action,
  Link,
  variant,
}: {
  action: DetailAction
  Link: DetailLinkComponent
  variant: "default" | "outline"
}) {
  const content = (
    <>
      {action.icon ? <span data-icon="inline-start">{action.icon}</span> : null}
      {action.label}
    </>
  )
  // Link de verdade (role "link"), com a aparência de botão.
  return action.href ? (
    <Link href={action.href} className={buttonVariants({ variant })}>
      {content}
    </Link>
  ) : (
    <Button
      variant={variant}
      onClick={action.onClick}
      disabled={action.disabled}
    >
      {content}
    </Button>
  )
}

/**
 * Página de detalhe: cabeçalho (título, metadados, ações), abas e painel
 * lateral. Ação primária em botão, secundárias num menu, destrutiva com
 * confirmação. Navegação e dados entram por props.
 */
export function DetailPage({
  title,
  description,
  badges,
  summary,
  primaryAction,
  secondaryActions = [],
  destructiveAction,
  tabs,
  tab,
  defaultTab,
  onTabChange,
  children,
  metadata,
  metadataTitle,
  aside,
  status = "ready",
  onRetry,
  linkComponent: Link = "a",
  labels: labelsProp,
  className,
}: DetailPageProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const [confirming, setConfirming] = useState(false)

  if (status === "loading")
    return <LoadingState variant="detail" label={labels.loading} />
  if (status === "error")
    return (
      <ErrorState
        title={labels.errorTitle}
        description={labels.errorDescription}
        onRetry={onRetry}
        retryLabel={labels.retry}
      />
    )
  if (status === "not-found")
    return (
      <NotFoundState
        title={labels.notFoundTitle}
        description={labels.notFoundDescription}
      />
    )

  const hasMenu = secondaryActions.length > 0 || destructiveAction
  const hasAside = (metadata && metadata.length > 0) || aside

  return (
    <div
      data-slot="detail-page"
      className={cn("@container flex min-w-0 flex-col gap-6", className)}
    >
      <header className="flex flex-col gap-4 @xl:flex-row @xl:items-start @xl:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-heading text-xl font-semibold break-words">
              {title}
            </h1>
            {badges}
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
          {summary && summary.length > 0 ? (
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {summary.map((item) => (
                <div key={item.label} className="flex gap-1">
                  <dt>{item.label}:</dt>
                  <dd className="text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {primaryAction || hasMenu ? (
          <div className="flex flex-wrap items-center gap-2">
            {primaryAction ? (
              <ActionButton
                action={primaryAction}
                Link={Link}
                variant="default"
              />
            ) : null}
            {hasMenu ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={labels.moreActions}
                    />
                  }
                >
                  <Icons.more />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuGroup>
                    {secondaryActions.map((action) => (
                      <DropdownMenuItem
                        key={action.label}
                        disabled={action.disabled}
                        onClick={action.onClick}
                        render={
                          action.href ? <Link href={action.href} /> : undefined
                        }
                      >
                        {action.icon}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  {destructiveAction ? (
                    <>
                      {secondaryActions.length > 0 ? (
                        <DropdownMenuSeparator />
                      ) : null}
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setConfirming(true)}
                        >
                          {destructiveAction.icon ?? <Icons.trash />}
                          {destructiveAction.label}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}
      </header>

      <div
        className={cn(
          "grid min-w-0 gap-6",
          hasAside && "@3xl:grid-cols-[minmax(0,1fr)_18rem]"
        )}
      >
        <div className="min-w-0">
          {tabs && tabs.length > 0 ? (
            <Tabs
              value={tab}
              defaultValue={defaultTab ?? tabs[0].value}
              onValueChange={(value) => onTabChange?.(String(value))}
            >
              <div className="max-w-full overflow-x-auto">
                <TabsList variant="line">
                  {tabs.map((item) => (
                    <TabsTrigger key={item.value} value={item.value}>
                      {item.label}
                      {item.badge}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {tabs.map((item) => (
                <TabsContent
                  key={item.value}
                  value={item.value}
                  className="pt-2"
                >
                  {item.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            children
          )}
        </div>

        {hasAside ? (
          <aside
            aria-label={metadataTitle ?? labels.metadata}
            className="flex flex-col gap-4 self-start rounded-lg border bg-card p-4 text-card-foreground"
          >
            <h2 className="font-heading text-sm font-semibold">
              {metadataTitle ?? labels.metadata}
            </h2>
            {metadata && metadata.length > 0 ? (
              <dl className="flex flex-col gap-3 text-sm">
                {metadata.map((item) => (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="break-words">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {aside}
          </aside>
        ) : null}
      </div>

      {destructiveAction ? (
        <ConfirmDestructive
          open={confirming}
          onOpenChange={setConfirming}
          onConfirm={destructiveAction.onConfirm}
          confirmLabel={
            destructiveAction.confirm?.confirmLabel ?? destructiveAction.label
          }
          title={destructiveAction.confirm?.title}
          description={destructiveAction.confirm?.description}
        />
      ) : null}
    </div>
  )
}
