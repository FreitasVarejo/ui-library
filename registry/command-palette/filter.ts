/** Prefixo do valor dos itens da busca assíncrona: o filtro local não os mexe. */
export const REMOTE_PREFIX = "remote:"

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

/**
 * Filtro do `cmdk`: sem acento, sem caixa; todas as palavras da busca têm de
 * aparecer no rótulo ou nas palavras-chave. Começar pela busca pontua mais.
 * Resultados da busca assíncrona já vêm filtrados e passam sempre.
 */
export function paletteFilter(
  value: string,
  search: string,
  keywords: string[] = []
): number {
  if (value.startsWith(REMOTE_PREFIX)) return 1
  const words = normalize(search).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const haystack = normalize(keywords.join(" "))
  if (!words.every((word) => haystack.includes(word))) return 0
  return haystack.startsWith(words[0]) ? 1 : 0.5
}
