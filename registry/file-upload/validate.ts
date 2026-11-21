import type { FileRules } from "./types"

export type FileRejection = "type" | "size"

function matchesAccept(file: File, token: string): boolean {
  const rule = token.trim().toLowerCase()
  if (rule === "") return false
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  if (rule.startsWith(".")) return name.endsWith(rule)
  if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1))
  return type === rule
}

/** `null` se o arquivo passa; senão o motivo (tipo vem antes de tamanho). */
export function validateFile(
  file: File,
  { accept, maxSize }: FileRules
): FileRejection | null {
  if (
    accept &&
    accept.length > 0 &&
    !accept.some((token) => matchesAccept(file, token))
  )
    return "type"
  if (maxSize !== undefined && file.size > maxSize) return "size"
  return null
}
