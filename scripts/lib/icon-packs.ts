// Mapa dos nomes semânticos de ícone para cada pacote suportado.
// Os blocos só conhecem as chaves (Icons.search, Icons.empty...); o tema
// instala o `lib/icons.ts` do pacote escolhido pela marca.

export const ICON_KEYS = [
  "search",
  "home",
  "list",
  "upload",
  "file",
  "folder",
  "settings",
  "user",
  "logout",
  "sidebar",
  "chevronDown",
  "chevronsUpDown",
  "check",
  "close",
  "plus",
  "trash",
  "undo",
  "retry",
  "info",
  "success",
  "warning",
  "error",
  "empty",
  "notFound",
  "forbidden",
  "loading",
  "sort",
  "sortAsc",
  "sortDesc",
  "filter",
  "columns",
  "chevronLeft",
  "chevronRight",
  "more",
  "edit",
] as const

export type IconKey = (typeof ICON_KEYS)[number]

export type IconPackName = "lucide" | "phosphor" | "tabler"

export interface IconPack {
  /** pacote npm, com a faixa de versão que o registry instala */
  dependency: string
  /** nome do pacote sem versão, para o `import` */
  module: string
  names: Record<IconKey, string>
}

export const ICON_PACKS: Record<IconPackName, IconPack> = {
  lucide: {
    dependency: "lucide-react@^1",
    module: "lucide-react",
    names: {
      search: "Search",
      home: "House",
      list: "List",
      upload: "Upload",
      file: "File",
      folder: "Folder",
      settings: "Settings",
      user: "User",
      logout: "LogOut",
      sidebar: "PanelLeft",
      chevronDown: "ChevronDown",
      chevronsUpDown: "ChevronsUpDown",
      check: "Check",
      close: "X",
      plus: "Plus",
      trash: "Trash2",
      undo: "Undo2",
      retry: "RotateCw",
      info: "Info",
      success: "CircleCheck",
      warning: "TriangleAlert",
      error: "OctagonX",
      empty: "Inbox",
      notFound: "FileQuestionMark",
      forbidden: "ShieldAlert",
      loading: "LoaderCircle",
      sort: "ArrowUpDown",
      sortAsc: "ArrowUp",
      sortDesc: "ArrowDown",
      filter: "ListFilter",
      columns: "Columns3",
      chevronLeft: "ChevronLeft",
      chevronRight: "ChevronRight",
      more: "Ellipsis",
      edit: "Pencil",
    },
  },
  phosphor: {
    dependency: "@phosphor-icons/react@^2",
    module: "@phosphor-icons/react",
    names: {
      search: "MagnifyingGlass",
      home: "House",
      list: "List",
      upload: "UploadSimple",
      file: "File",
      folder: "Folder",
      settings: "Gear",
      user: "User",
      logout: "SignOut",
      sidebar: "SidebarSimple",
      chevronDown: "CaretDown",
      chevronsUpDown: "CaretUpDown",
      check: "Check",
      close: "X",
      plus: "Plus",
      trash: "Trash",
      undo: "ArrowUUpLeft",
      retry: "ArrowClockwise",
      info: "Info",
      success: "CheckCircle",
      warning: "Warning",
      error: "WarningOctagon",
      empty: "Tray",
      notFound: "FileDashed",
      forbidden: "LockKey",
      loading: "CircleNotch",
      sort: "ArrowsDownUp",
      sortAsc: "ArrowUp",
      sortDesc: "ArrowDown",
      filter: "Funnel",
      columns: "Columns",
      chevronLeft: "CaretLeft",
      chevronRight: "CaretRight",
      more: "DotsThree",
      edit: "PencilSimple",
    },
  },
  tabler: {
    dependency: "@tabler/icons-react@^3",
    module: "@tabler/icons-react",
    names: {
      search: "IconSearch",
      home: "IconHome",
      list: "IconList",
      upload: "IconUpload",
      file: "IconFile",
      folder: "IconFolder",
      settings: "IconSettings",
      user: "IconUser",
      logout: "IconLogout",
      sidebar: "IconLayoutSidebar",
      chevronDown: "IconChevronDown",
      chevronsUpDown: "IconSelector",
      check: "IconCheck",
      close: "IconX",
      plus: "IconPlus",
      trash: "IconTrash",
      undo: "IconArrowBackUp",
      retry: "IconRefresh",
      info: "IconInfoCircle",
      success: "IconCircleCheck",
      warning: "IconAlertTriangle",
      error: "IconAlertOctagon",
      empty: "IconInbox",
      notFound: "IconFileUnknown",
      forbidden: "IconLock",
      loading: "IconLoader2",
      sort: "IconArrowsSort",
      sortAsc: "IconArrowUp",
      sortDesc: "IconArrowDown",
      filter: "IconFilter",
      columns: "IconColumns3",
      chevronLeft: "IconChevronLeft",
      chevronRight: "IconChevronRight",
      more: "IconDots",
      edit: "IconPencil",
    },
  },
}

export function isIconPackName(value: unknown): value is IconPackName {
  return typeof value === "string" && value in ICON_PACKS
}

function alias(name: string): string {
  return name.startsWith("Icon") || name.endsWith("Icon") ? name : `${name}Icon`
}

/** Conteúdo do `lib/icons.ts` que o tema instala no consumidor. */
export function renderIconsFile(packName: IconPackName): string {
  const pack = ICON_PACKS[packName]
  const imports = ICON_KEYS.map((key) => {
    const name = pack.names[key]
    const local = alias(name)
    return local === name ? `  ${name},` : `  ${name} as ${local},`
  })
  const entries = ICON_KEYS.map((key) => `  ${key}: ${alias(pack.names[key])},`)
  return [
    `// Gerado por scripts/theme.ts (pacote: ${packName}). Não edite à mão:`,
    `// para trocar de pacote, instale outro theme-<nome>.`,
    `// Os blocos importam ícone só daqui, pelo nome semântico.`,
    `import {`,
    ...imports,
    `} from "${pack.module}"`,
    ``,
    `export const Icons = {`,
    ...entries,
    `} as const`,
    ``,
    `export type IconName = keyof typeof Icons`,
    ``,
  ].join("\n")
}
