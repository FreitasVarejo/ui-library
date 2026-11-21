import { useEffect, useMemo, useState } from "react"
import { createColumnHelper } from "@tanstack/react-table"
import type { PaginationState, SortingState } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { notify } from "@registry/feedback/notify"
import { DataTable } from "@registry/data-table/data-table"
import type { DataTableFeatures } from "@registry/data-table/features"
import { matchesFacet, matchesSearch } from "@registry/data-table/filters"
import type {
  DataTableBulkAction,
  DataTableFacet,
} from "@registry/data-table/types"
import { Icons } from "@/lib/icons"
import { DOCUMENTS, STATUS_LABEL, dateFormat } from "../demo-data"
import type { DemoDocument, DocStatus } from "../demo-data"
import { Section, Specimen } from "../section"

const columnHelper = createColumnHelper<DataTableFeatures, DemoDocument>()

const STATUS_VARIANT: Record<
  DocStatus,
  "secondary" | "outline" | "destructive"
> = { indexado: "secondary", processando: "outline", falhou: "destructive" }

const columns = columnHelper.columns([
  columnHelper.accessor("title", {
    header: "Documento",
    cell: ({ row }) => (
      <a
        href={`#${row.original.id}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.title}
      </a>
    ),
    enableHiding: false,
  }),
  columnHelper.accessor("type", { header: "Tipo" }),
  columnHelper.accessor("status", {
    header: "Situação",
    cell: ({ getValue }) => (
      <Badge variant={STATUS_VARIANT[getValue()]}>
        {STATUS_LABEL[getValue()]}
      </Badge>
    ),
  }),
  columnHelper.accessor("author", { header: "Autor" }),
  columnHelper.accessor("pages", {
    header: "Páginas",
    cell: ({ getValue }) => (
      <span className="block text-right tabular-nums">{getValue()}</span>
    ),
  }),
  columnHelper.accessor("updated", {
    header: "Atualizado",
    cell: ({ getValue }) => dateFormat.format(new Date(getValue())),
  }),
  columnHelper.display({
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ações de ${row.original.title}`}
            />
          }
        >
          <Icons.more />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Icons.edit />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <Icons.trash />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  }),
])

const FACETS: DataTableFacet[] = [
  { columnId: "type", label: "Tipo" },
  { columnId: "status", label: "Situação" },
]

const bulkActions: DataTableBulkAction<DemoDocument>[] = [
  {
    id: "reindex",
    label: "Reindexar",
    icon: <Icons.retry />,
    onAction: ({ ids }) => {
      notify.success(`${ids.length} na fila de indexação`)
    },
  },
  {
    id: "delete",
    label: "Excluir",
    icon: <Icons.trash />,
    destructive: true,
    onAction: ({ ids }) => {
      notify.success(`${ids.length} excluído(s)`)
    },
  },
]

// "Servidor" de mentira: filtra, ordena e pagina com a mesma regra da tabela.
const SERVER_LATENCY_MS = 350

function queryServer(
  search: string,
  facets: Record<string, string[]>,
  sorting: SortingState,
  { pageIndex, pageSize }: PaginationState
) {
  const matches = (doc: DemoDocument, ignore?: string) =>
    matchesSearch(`${doc.title} ${doc.author}`, search) &&
    (ignore === "type" || matchesFacet(doc.type, facets.type ?? [])) &&
    (ignore === "status" || matchesFacet(doc.status, facets.status ?? []))
  const filtered = DOCUMENTS.filter((doc) => matches(doc))
  const [sort] = sorting
  if (sort) {
    const key = sort.id as keyof DemoDocument
    filtered.sort((a, b) => {
      const result = String(a[key]).localeCompare(String(b[key]), "pt-BR", {
        numeric: true,
      })
      return sort.desc ? -result : result
    })
  }
  const count = (key: "type" | "status") => {
    const counts = new Map<string, number>()
    for (const doc of DOCUMENTS.filter((item) => matches(item, key)))
      counts.set(doc[key], (counts.get(doc[key]) ?? 0) + 1)
    return [...counts].map(([value, total]) => ({
      value,
      label: key === "status" ? STATUS_LABEL[value as DocStatus] : value,
      count: total,
    }))
  }
  return {
    rows: filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    total: filtered.length,
    facets: [
      { columnId: "type", label: "Tipo", options: count("type") },
      { columnId: "status", label: "Situação", options: count("status") },
    ],
  }
}

function ServerTable() {
  const [search, setSearch] = useState("")
  const [facetFilters, setFacetFilters] = useState<Record<string, string[]>>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [answer, setAnswer] = useState<{
    key: string
    result: ReturnType<typeof queryServer>
  }>()
  const key = JSON.stringify([search, facetFilters, sorting, pagination])
  const loading = answer?.key !== key
  const result = answer?.result

  useEffect(() => {
    const timer = setTimeout(
      () =>
        setAnswer({
          key,
          result: queryServer(search, facetFilters, sorting, pagination),
        }),
      SERVER_LATENCY_MS
    )
    return () => clearTimeout(timer)
  }, [key, search, facetFilters, sorting, pagination])

  return (
    <DataTable
      mode="server"
      columns={columns}
      data={result?.rows ?? []}
      rowCount={result?.total ?? 0}
      loading={loading}
      facets={result?.facets ?? FACETS}
      search={search}
      onSearchChange={setSearch}
      facetFilters={facetFilters}
      onFacetFiltersChange={setFacetFilters}
      sorting={sorting}
      onSortingChange={setSorting}
      pagination={pagination}
      onPaginationChange={setPagination}
      bulkActions={bulkActions}
    />
  )
}

export function DataTablePage() {
  const [failed, setFailed] = useState(true)
  const clientData = useMemo(() => DOCUMENTS, [])

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Modo client"
        description="Todos os dados na mão: busca sem acento, facetas com contagem, ordenação pelo cabeçalho, colunas visíveis, seleção com ações em lote."
      >
        <DataTable
          columns={columns}
          data={clientData}
          facets={FACETS}
          bulkActions={bulkActions}
          searchPlaceholder="Buscar por título ou autor…"
        />
      </Section>

      <Section
        title="Modo server"
        description="Busca, facetas, ordenação e página são estado do pai (props + callbacks); a tabela só mostra a página recebida. Aqui um servidor de mentira responde em 350 ms."
      >
        <ServerTable />
      </Section>

      <Section title="Estados" description="Carregando, vazio e erro.">
        <div className="grid gap-4">
          <Specimen label="loading">
            <DataTable columns={columns} data={[]} loading />
          </Specimen>
          <Specimen label="vazio">
            <DataTable columns={columns} data={[]} facets={FACETS} />
          </Specimen>
          <Specimen label="erro">
            {failed ? (
              <DataTable
                columns={columns}
                data={[]}
                error="GET /api/documentos 503 Service Unavailable"
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
