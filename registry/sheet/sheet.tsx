import * as React from "react"
import { Drawer } from "@base-ui/react/drawer"

import { cn } from "@/lib/utils"
import { whoOpened } from "./focus-return"
import { enterStack, leaveStack, stackTop, subscribeStack } from "./sheet-stack"

export type SheetSide = "bottom" | "top" | "left" | "right"

export interface SheetProps extends Omit<
  Drawer.Popup.Props,
  "className" | "children" | "initialFocus" | "finalFocus"
> {
  /**
   * Aberta ou fechada. Sem a prop, a folha está aberta enquanto estiver
   * montada: `{aberta && <Sheet ...>}` abre e fecha sem animação de saída. Com
   * a prop a folha sai animada.
   */
  open?: boolean
  /**
   * Chamado quando a pessoa pede para fechar a folha (Esc, e toque fora ou
   * arrasto se ligados), e só na folha de cima da pilha. **Ausente, a folha não
   * tem como fechar sozinha**: Esc, toque fora e arrasto não fazem nada (a
   * pergunta que o professor precisa responder). Fechar de dentro é
   * `SheetClose` ou o seu próprio estado.
   */
  onOpenChange?: (
    open: boolean,
    details: Drawer.Root.ChangeEventDetails
  ) => void
  /** Borda de onde a folha sai. @default "bottom" */
  side?: SheetSide
  /**
   * O voltar do aparelho. Um elemento que a folha monta só enquanto está
   * aberta e no topo da pilha (o roteador aceita um bloqueio de navegação por
   * vez), por exemplo `<VoltarFechaAFolha onClose={fechar} />`. A folha não
   * mexe no histórico: a peça é de quem conhece o roteador.
   */
  backGuard?: React.ReactNode
  /** O toque no fundo fecha a folha, se houver `onOpenChange`. @default false */
  dismissOnOutsidePress?: boolean
  /** Arrastar a folha para a borda a fecha, se houver `onOpenChange`. @default false */
  swipeToDismiss?: boolean
  /**
   * Quem recebe o foco ao abrir. Padrão: o `SheetTitle`, e sem ele o primeiro
   * controle. Aceita um ref, uma função ou `false`.
   */
  initialFocus?: Drawer.Popup.Props["initialFocus"]
  /**
   * Quem recebe o foco ao fechar. Padrão: o controle que abriu a folha, mesmo
   * quando o toque não o focou (Safari do iOS).
   */
  finalFocus?: Drawer.Popup.Props["finalFocus"]
  className?: string
  children?: React.ReactNode
}

const SWIPE_DIRECTION = {
  bottom: "down",
  top: "up",
  left: "left",
  right: "right",
} as const

const VIEWPORT_BY_SIDE: Record<SheetSide, string> = {
  bottom: "items-end justify-center",
  top: "items-start justify-center",
  left: "items-stretch justify-start",
  right: "items-stretch justify-end",
}

const POPUP_BY_SIDE: Record<SheetSide, string> = {
  bottom:
    "max-h-dvh w-full rounded-t-xl border-t pb-[max(1rem,env(safe-area-inset-bottom))] [transform:translateY(var(--drawer-swipe-movement-y))] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]",
  top: "max-h-dvh w-full rounded-b-xl border-b [transform:translateY(var(--drawer-swipe-movement-y))] data-ending-style:[transform:translateY(-100%)] data-starting-style:[transform:translateY(-100%)]",
  left: "h-full w-3/4 border-r sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x))] data-ending-style:[transform:translateX(-100%)] data-starting-style:[transform:translateX(-100%)]",
  right:
    "h-full w-3/4 border-l sm:max-w-sm [transform:translateX(var(--drawer-swipe-movement-x))] data-ending-style:[transform:translateX(100%)] data-starting-style:[transform:translateX(100%)]",
}

const SheetContext = React.createContext<{
  setTitle: (node: HTMLElement | null) => void
} | null>(null)

function assignRef<T>(ref: React.Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node)
  else if (ref) ref.current = node
}

/**
 * Folha modal sobre o Drawer do Base UI: `role="dialog"` com o nome vindo do
 * `SheetTitle`, foco preso, fundo inerte, Esc, retorno do foco e pilha.
 *
 * - **Pilha**: com duas abertas, só a de cima responde ao Esc, ao toque fora e
 *   ao arrasto, e só ela monta o `backGuard`. Fechada a de cima, o foco volta
 *   ao controle que a abriu, na de baixo, que segue utilizável.
 * - **Retorno do foco**: ao controle que abriu a folha, e não ao `body`,
 *   inclusive quando o toque não o focou (Safari do iOS).
 * - **Voltar do aparelho**: por `backGuard`. A folha não faz `pushState` nem
 *   deixa entrada no histórico.
 */
export function Sheet({
  open = true,
  onOpenChange,
  side = "bottom",
  backGuard,
  dismissOnOutsidePress = false,
  swipeToDismiss = false,
  initialFocus,
  finalFocus,
  className,
  children,
  ref,
  ...props
}: SheetProps) {
  const popupRef = React.useRef<HTMLElement | null>(null)
  const titleRef = React.useRef<HTMLElement | null>(null)
  const context = React.useMemo(
    () => ({
      setTitle: (node: HTMLElement | null) => {
        titleRef.current = node
      },
    }),
    []
  )

  // Quem abriu é lido na renderização em que `open` vira true: o foco ainda
  // está no controle que abriu, e o Base UI só o move depois do commit.
  const [wasOpen, setWasOpen] = React.useState(false)
  const [opener, setOpener] = React.useState<HTMLElement | null>(null)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setOpener(whoOpened())
  }

  React.useLayoutEffect(() => {
    if (!open) return
    enterStack(popupRef)
    return () => leaveStack(popupRef)
  }, [open])
  const top = React.useSyncExternalStore(subscribeStack, stackTop, stackTop)
  const atTop = open && top === popupRef

  function handleOpenChange(
    next: boolean,
    details: Drawer.Root.ChangeEventDetails
  ) {
    if (next || !onOpenChange) return
    // Os ouvintes de todas as folhas estão no mesmo `document`: sem esta
    // linha o Esc fecharia a de baixo junto com a de cima.
    if (stackTop() !== popupRef) return
    if (details.reason === "swipe" && !swipeToDismiss) return
    onOpenChange(next, details)
  }

  return (
    <SheetContext value={context}>
      {atTop ? backGuard : null}
      <Drawer.Root
        open={open}
        onOpenChange={handleOpenChange}
        swipeDirection={SWIPE_DIRECTION[side]}
        disablePointerDismissal={!dismissOnOutsidePress}
      >
        <Drawer.Portal>
          <Drawer.Backdrop
            data-slot="sheet-overlay"
            className="fixed inset-0 z-50 bg-foreground/20 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none"
          />
          <Drawer.Viewport
            data-slot="sheet-viewport"
            className={cn("fixed inset-0 z-50 flex", VIEWPORT_BY_SIDE[side])}
          >
            <Drawer.Popup
              {...props}
              data-slot="sheet"
              data-side={side}
              // O Base UI não escreve `aria-modal` no diálogo. Vem depois do
              // `{...props}`, como o `data-slot`, para que nada de quem chama o derrube.
              aria-modal="true"
              data-base-ui-swipe-ignore={swipeToDismiss ? undefined : ""}
              ref={(node) => {
                popupRef.current = node
                assignRef(ref, node)
              }}
              initialFocus={initialFocus ?? (() => titleRef.current ?? true)}
              finalFocus={
                finalFocus ?? (() => (opener?.isConnected ? opener : false))
              }
              className={cn(
                "flex flex-col gap-4 overflow-y-auto overscroll-contain bg-popover bg-clip-padding p-4 text-sm text-popover-foreground shadow-lg transition-transform duration-200 ease-out outline-none data-swiping:duration-0 data-swiping:select-none motion-reduce:transition-none",
                POPUP_BY_SIDE[side],
                className
              )}
            >
              <Drawer.Content className="contents">{children}</Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </SheetContext>
  )
}

/**
 * O título da folha: dá o nome acessível ao diálogo e recebe o foco ao abrir
 * (`tabindex=-1`, então o leitor de tela lê o título e nenhum botão fica
 * armado). Troque o nível do título por `render={<h1 />}`.
 */
export function SheetTitle({ className, ref, ...props }: Drawer.Title.Props) {
  const context = React.use(SheetContext)
  return (
    <Drawer.Title
      data-slot="sheet-title"
      tabIndex={-1}
      ref={(node) => {
        context?.setTitle(node)
        assignRef(ref, node)
      }}
      className={cn(
        "font-heading text-base font-medium text-foreground outline-none",
        className as string | undefined
      )}
      {...props}
    />
  )
}

export function SheetDescription({
  className,
  ...props
}: Drawer.Description.Props) {
  return (
    <Drawer.Description
      data-slot="sheet-description"
      className={cn(
        "text-sm text-muted-foreground",
        className as string | undefined
      )}
      {...props}
    />
  )
}

/** Fecha a folha de dentro dela; use `render={<Button />}` para o visual. */
export function SheetClose(props: Drawer.Close.Props) {
  return <Drawer.Close data-slot="sheet-close" {...props} />
}
