import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { SearchResults } from "@registry/search-results/search-results"
import type { HighlightRange } from "@registry/search-results/highlight"
import type {
  SearchResultItem,
  SearchStatus,
} from "@registry/search-results/types"
import { normalizeText } from "@registry/data-table/filters"
import { Icons } from "@/lib/icons"
import { DOCUMENTS, dateFormat } from "../demo-data"
import type { DemoDocument } from "../demo-data"
import { Section, Specimen } from "../section"

/** Faixas onde cada palavra da busca aparece no texto (sem acento, sem caixa). */
function rangesFor(text: string, query: string): HighlightRange[] {
  const haystack = normalizeText(text)
  const ranges: HighlightRange[] = []
  for (const word of normalizeText(query).split(/\s+/).filter(Boolean)) {
    for (
      let at = haystack.indexOf(word);
      at !== -1;
      at = haystack.indexOf(word, at + word.length)
    )
      ranges.push([at, at + word.length])
  }
  return ranges
}

function toResult(doc: DemoDocument, query: string): SearchResultItem {
  return {
    id: doc.id,
    title: doc.title,
    titleHighlights: rangesFor(doc.title, query),
    href: `#${doc.id}`,
    snippet: doc.snippet,
    highlights: rangesFor(doc.snippet, query),
    icon: <Icons.file className="size-4" />,
    meta: [
      { label: "Tipo", value: doc.type },
      { label: "Autor", value: doc.author },
      {
        label: "Atualizado em",
        value: dateFormat.format(new Date(doc.updated)),
      },
      { label: "Páginas", value: `${doc.pages} p.` },
    ],
  }
}

const SORTS = [
  { value: "relevance", label: "Relevância" },
  { value: "recent", label: "Mais recentes" },
  { value: "title", label: "Título" },
]

function LiveSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [facets, setFacets] = useState<Record<string, string[]>>({})
  const [sort, setSort] = useState("relevance")
  const [done, setDone] = useState<string>()

  const key = JSON.stringify([query, facets, sort])
  const status: SearchStatus =
    query === "" && Object.values(facets).every((v) => v.length === 0)
      ? "idle"
      : done === key
        ? "ready"
        : "loading"

  useEffect(() => {
    const timer = setTimeout(() => setDone(key), 400)
    return () => clearTimeout(timer)
  }, [key])

  const { results, options } = useMemo(() => {
    const words = normalizeText(query).split(/\s+/).filter(Boolean)
    const textMatches = (doc: DemoDocument) =>
      words.every((word) =>
        normalizeText(`${doc.title} ${doc.snippet}`).includes(word)
      )
    const facetMatches = (doc: DemoDocument, ignore?: "type" | "author") =>
      (ignore === "type" ||
        !facets.type?.length ||
        facets.type.includes(doc.type)) &&
      (ignore === "author" ||
        !facets.author?.length ||
        facets.author.includes(doc.author))
    const hits = DOCUMENTS.filter(
      (doc) => textMatches(doc) && facetMatches(doc)
    )
    if (sort === "recent")
      hits.sort((a, b) => b.updated.localeCompare(a.updated))
    if (sort === "title")
      hits.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
    const count = (key: "type" | "author") => {
      const counts = new Map<string, number>()
      for (const doc of DOCUMENTS.filter(
        (d) => textMatches(d) && facetMatches(d, key)
      ))
        counts.set(doc[key], (counts.get(doc[key]) ?? 0) + 1)
      return [...counts]
        .sort((a, b) => b[1] - a[1])
        .map(([value, total]) => ({ value, count: total }))
    }
    return {
      results: hits.map((doc) => toResult(doc, query)),
      options: { type: count("type"), author: count("author") },
    }
  }, [query, facets, sort])

  return (
    <SearchResults
      query={query}
      onSearch={setQuery}
      status={status}
      results={results}
      total={results.length}
      facets={[
        { id: "type", label: "Tipo", options: options.type },
        { id: "author", label: "Autor", options: options.author },
      ]}
      selectedFacets={facets}
      onFacetsChange={setFacets}
      sortOptions={SORTS}
      sort={sort}
      onSortChange={setSort}
    />
  )
}

export function SearchResultsPage() {
  const [failed, setFailed] = useState(true)
  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Busca ao vivo"
        description="Digite e envie: o destaque vem de faixas calculadas pelo pai (sem acento, sem caixa). No celular os filtros abrem num Sheet."
      >
        <LiveSearch initialQuery="reunião" />
      </Section>

      <Section title="Estados">
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="sem busca ainda">
            <SearchResults
              query=""
              onSearch={() => undefined}
              status="idle"
              facets={[]}
            />
          </Specimen>
          <Specimen label="carregando">
            <SearchResults
              query="contrato"
              onSearch={() => undefined}
              status="loading"
            />
          </Specimen>
          <Specimen label="sem resultado, com filtro ativo">
            <SearchResults
              query="zeppelin"
              onSearch={() => undefined}
              status="ready"
              results={[]}
              facets={[
                {
                  id: "type",
                  label: "Tipo",
                  options: [{ value: "PDF", count: 0 }],
                },
              ]}
              selectedFacets={{ type: ["PDF"] }}
              onFacetsChange={() => undefined}
            />
          </Specimen>
          <Specimen label="erro">
            {failed ? (
              <SearchResults
                query="contrato"
                onSearch={() => undefined}
                status="error"
                onRetry={() => setFailed(false)}
              />
            ) : (
              <Button variant="outline" onClick={() => setFailed(true)}>
                Mostrar o erro de novo
              </Button>
            )}
          </Specimen>
        </div>
      </Section>
    </div>
  )
}
