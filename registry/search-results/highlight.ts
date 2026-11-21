/** Faixa `[início, fim)` em unidades UTF-16 (os índices de `String.prototype`). */
export type HighlightRange = readonly [start: number, end: number]

export interface TextSegment {
  text: string
  highlighted: boolean
}

/**
 * Parte o texto nas faixas de destaque. Faixas fora do texto são cortadas,
 * vazias ou inválidas são ignoradas e as que se tocam ou cruzam viram uma só.
 * O resultado é só texto: quem renderiza decide como marcar, e nada aqui
 * vira HTML.
 */
export function splitByRanges(
  text: string,
  ranges: readonly HighlightRange[] = []
): TextSegment[] {
  const valid = ranges
    .map(([start, end]) => [Math.max(0, start), Math.min(text.length, end)])
    .filter(
      ([start, end]) =>
        Number.isFinite(start) && Number.isFinite(end) && end > start
    )
    .sort((a, b) => a[0] - b[0])

  const merged: Array<[number, number]> = []
  for (const [start, end] of valid) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }

  const segments: TextSegment[] = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor)
      segments.push({ text: text.slice(cursor, start), highlighted: false })
    segments.push({ text: text.slice(start, end), highlighted: true })
    cursor = end
  }
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), highlighted: false })
  return segments
}
