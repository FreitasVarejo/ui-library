import { splitByRanges } from "./highlight"
import type { HighlightRange } from "./highlight"

export interface HighlightedTextProps {
  text: string
  ranges?: readonly HighlightRange[]
}

/**
 * Texto com `<mark>` nas faixas recebidas. O texto entra como nó de texto do
 * React (nunca como HTML), então `<script>` ou `<img onerror>` no trecho
 * aparece literal.
 */
export function HighlightedText({ text, ranges }: HighlightedTextProps) {
  return (
    <>
      {splitByRanges(text, ranges).map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={index}
            className="rounded-sm bg-primary/20 px-0.5 text-foreground"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  )
}
