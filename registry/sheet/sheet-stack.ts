import type { RefObject } from "react"

export type SheetRef = RefObject<HTMLElement | null>

/**
 * A pilha de folhas abertas, em ordem de abertura. O Base UI cuida do foco
 * preso e do fundo inerte de cada folha, mas só conhece como aninhadas as que
 * estão uma dentro da outra na árvore do React; duas folhas irmãs (a pergunta
 * que monta por cima de outra por um evento) são dois modais sem relação, e o
 * Esc fecharia as duas. A pilha é o que diz quem é a de cima: só ela responde
 * ao Esc, ao toque fora e ao arrasto, e só ela monta o `backGuard`.
 */
const stack: SheetRef[] = []
const listeners = new Set<() => void>()

export function stackTop(): SheetRef | undefined {
  return stack[stack.length - 1]
}

export function isTopOfStack(ref: SheetRef): boolean {
  return stackTop() === ref
}

export function subscribeStack(listen: () => void): () => void {
  listeners.add(listen)
  return () => listeners.delete(listen)
}

export function enterStack(ref: SheetRef): void {
  stack.push(ref)
  notify()
}

export function leaveStack(ref: SheetRef): void {
  const position = stack.indexOf(ref)
  if (position !== -1) stack.splice(position, 1)
  notify()
}

function notify(): void {
  for (const listen of listeners) listen()
}
