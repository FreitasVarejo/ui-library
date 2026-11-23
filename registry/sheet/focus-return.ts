import { stackTop } from "./sheet-stack"

/** Só o que o teclado alcança de verdade. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * O último controle que a pessoa ativou por clique ou toque.
 *
 * No Safari do iOS tocar num botão não o foca: quando a folha abre,
 * `document.activeElement` já é o `body` e o Base UI não teria a quem devolver
 * o foco ao fechar. O `click` em captura no `document` roda antes de qualquer
 * handler do React, então já sabe quem foi tocado quando a folha abre como
 * consequência do toque. O ouvinte nasce com o módulo, e não com a primeira
 * folha, porque é esse primeiro toque que abre a primeira folha.
 */
let lastActivated: HTMLElement | null = null

function rememberWhoWasActivated(event: Event): void {
  const target =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>(FOCUSABLE_SELECTOR)
      : null
  lastActivated = target
}

if (typeof document !== "undefined") {
  document.addEventListener("click", rememberWhoWasActivated, true)
}

/**
 * Registra quem abriu a folha quando não houve clique nele (o arquivo solto
 * sobre a tela abre a folha como o toque no botão abriria): vale o mesmo que
 * um clique.
 */
export function rememberOpener(element: HTMLElement): void {
  lastActivated = element
}

/**
 * Quem abriu a folha: o elemento com foco; quando o navegador não focou o
 * toque (`body`) ou o foco está num título `tabindex=-1` que uma folha de baixo
 * focou ao abrir (fora do `FOCUSABLE_SELECTOR`), o último controle ativado.
 *
 * O último ativado não expira por tempo, e sim pela pilha. Com uma folha já
 * aberta, só vale se estiver dentro dela: uma folha que abre sem toque não pode
 * devolver o foco a um controle do fundo, que segue inerte debaixo da de baixo,
 * onde o `focus()` é ignorado e o foco cairia no `body`. Aí vale o foco atual (o
 * título da folha de baixo). Sem folha aberta, vale o último tocado enquanto
 * estiver no documento.
 */
export function whoOpened(): HTMLElement | null {
  const active = document.activeElement
  if (
    active instanceof HTMLElement &&
    active !== document.body &&
    active.matches(FOCUSABLE_SELECTOR)
  ) {
    return active
  }
  const bottomSheet = stackTop()?.current ?? null
  if (
    lastActivated?.isConnected &&
    (bottomSheet === null || bottomSheet.contains(lastActivated))
  ) {
    return lastActivated
  }
  return active instanceof HTMLElement && active !== document.body
    ? active
    : null
}
