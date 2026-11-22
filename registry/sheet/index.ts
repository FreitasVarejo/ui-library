export { Sheet, SheetClose, SheetDescription, SheetTitle } from "./sheet"
export type { SheetProps, SheetSide } from "./sheet"
// Quem abriu a folha sem um clique nele (o arquivo solto na tela): o foco volta a ele ao fechar.
export { rememberOpener } from "./focus-return"
// A folha do topo da pilha: quem precisa saber se há outra folha por cima.
export { stackTop } from "./sheet-stack"
